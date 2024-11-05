const { broadcastStats } = require("./broadcasts/broadcastStats");
const { broadcastNewSensorData } = require("./broadcasts/broadcastNewSensorData");

module.exports = async (activeVisitors, activeUsers, activeSensors, ws, req, db, logger) => {
    try {
        ws.on('message', async (message) => {
            try {
                const data = JSON.parse(message);

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

                if (!activeSensors.get(credentials.id)) {
                    activeSensors.set(credentials.id, { ws, lastActive: Date.now() });
                    await db.collection('stats').updateOne({}, { $set: { 'active.sensors': activeSensors.size } });
                    
                    logger.info(`Sensor ${credentials.id} connected and validated`);
                    ws.send(JSON.stringify({ message: 'Credentials validated' }));
                } else {
                    activeSensors.get(credentials.id).lastActive = Date.now();
                }

                if (!data.sensorData) {
                    ws.send(JSON.stringify({ error: 'Missing sensor data' }));
                    return;
                }

                const { sensorData } = data;
                await db.collection('sensors').insertOne(sensorData);

                broadcastNewSensorData(data, logger, activeUsers, activeVisitors);

                logger.info('Sensor data received and broadcasted:', sensorData);
            } catch (error) {
                logger.error('Error handling sensor data:', error);
                ws.send(JSON.stringify({ error: 'Error handling sensor data' }));
            }
        });

        ws.on('close', async () => {
            const idsToRemove = [...activeSensors.keys()].filter(id => activeSensors.get(id).ws === ws);
            idsToRemove.forEach(id => activeSensors.delete(id));

            await db.collection("stats").updateOne({}, { $set: { 'active.sensors': activeSensors.size } });

            const currentStats = await db.collection("stats").findOne({});
            broadcastStats(currentStats, logger, activeVisitors, activeUsers);
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for sensor:`, error);
            const idsToRemove = [...activeSensors.keys()].filter(id => activeSensors.get(id).ws === ws);
            idsToRemove.forEach(id => activeSensors.delete(id));

            db.collection("stats").updateOne({}, { $set: { 'active.sensors': activeSensors.size } });
        });

    } catch (error) {
        logger.error("WebSocket error:", error);
        ws.close(4000, "Internal server error");
    }
};

async function validateCredentials(credentials, db) {
    try {
        // Perform actual validation logic here
        // const user = await db.collection('users').findOne({ apiKey: credentials.apiKey });
        // return !!user;
        return true; // Replace this with actual validation logic
    } catch (error) {
        console.error('Error validating credentials:', error);
        return false;
    }
}
