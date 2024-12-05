const { broadcastStats } = require("./broadcasts/broadcastStats");
const { broadcastNewSensorData } = require("./broadcasts/broadcastNewSensorData");

module.exports = async (activeVisitors, activeUsers, activeSensors, ws, req, db, logger) => {
    try {
        const pingInterval = 5000;
        let disconnected = false;

        const pingSensor = setInterval(() => {
            if (disconnected) {
                clearInterval(pingSensor);
                ws.close();
                return;
            }

            ws.ping();
            disconnected = true;
        }, pingInterval);

        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

                if (data.message === 'Pong') {
                    disconnected = false;
                    return;
                }

                if (!data.credentials) {
                    ws.send(JSON.stringify({ error: 'Missing credentials' }));
                    return;
                }

                const { credentials } = data;
                const validCredentials = await validateCredentials(credentials, db);
                
                if (!validCredentials) {
                    ws.send(JSON.stringify({ error: 'Invalid credentials' }));
                    return;
                }

                await db.collection('sensors').updateOne(
                    { id: credentials.id },  
                    { $set: { active: 0 } } 
                );

                if (!activeSensors.has(credentials.id)) {
                    activeSensors.set(credentials.id, { ws, lastActive: Date.now() });
                    await db.collection('stats').updateOne({}, { $set: { 'active.sensors': activeSensors.size } });
                    ws.send(JSON.stringify({ message: 'Credentials validated' }));
                    const currentStats = await db.collection("stats").findOne({});
                    broadcastStats(currentStats, logger, activeVisitors, activeUsers);
                } else {
                    activeSensors.get(credentials.id).lastActive = Date.now();
                }

                if (data.sensorData) {
                    //const { sensorData } = data;
                    //await db.collection('sensors').insertOne(sensorData);

                    broadcastNewSensorData(data.credentials.id, data.data, logger, activeUsers, activeVisitors);
                }
            } catch (error) {
                logger.error('Error handling sensor data:', error);
                ws.send(JSON.stringify({ error: 'Error handling sensor data' }));
            }
        });

        ws.on('close', async () => {
            clearInterval(pingSensor); 
            handleSensorDisconnection(ws, activeSensors, db, logger, activeVisitors, activeUsers);
        });

        ws.on('error', (error) => {
            clearInterval(pingSensor); 
            logger.error(`WebSocket error for sensor:`, error);
            handleSensorDisconnection(ws, activeSensors, db, logger, activeVisitors, activeUsers);
        });

    } catch (error) {
        logger.error("WebSocket error:", error);
        ws.close(4000, "Internal server error");
    }
};

async function validateCredentials(credentials, db) {
    try {
        if(!credentials.id || !credentials.auth)
        {
            return false;
        }
        const sensor = await db.collection('sensors').findOne({ id: credentials.id });
        if (!sensor) {
            return false;
        }
        if(sensor.auth != credentials.auth){
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error validating credentials:', error);
        return false;
    }
}

async function handleSensorDisconnection(ws, activeSensors, db, logger, activeVisitors, activeUsers) {
    const idsToRemove = [...activeSensors.keys()].filter(id => activeSensors.get(id).ws === ws);
    idsToRemove.forEach(id => activeSensors.delete(id));

    idsToRemove.forEach(async id => await db.collection('sensors').updateOne(
        { id: id },  
        { $set: { active: Date.now() } } 
    ));

    await db.collection("stats").updateOne({}, { $set: { 'active.sensors': activeSensors.size } });

    const currentStats = await db.collection("stats").findOne({});
    broadcastStats(currentStats, logger, activeVisitors, activeUsers);
}
