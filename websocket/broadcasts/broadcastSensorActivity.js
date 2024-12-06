const broadcastSensorActivity = async (logger, db, activeUsers, activeVisitors) => {
    const messageWithSensorActivityStatus = {
        sensorStatuses: []
    };

    try {
        const sensors = await db.collection('sensors').find({
            'active': 0
        }, {
            projection: { 'id': 1 } 
        }).toArray();

        for (const sensor of sensors) {
                const id = sensor.id;
                messageWithSensorActivityStatus.sensorStatuses.push({ id });
        }
    }
    catch (error) {
        logger.error("Error fetching users from database:", error);
    }

    const messageString = JSON.stringify(messageWithSensorActivityStatus);

    for (const [username, connections] of activeUsers) {
        connections.forEach(({ ws }) => {
            if (ws && typeof ws.send === 'function') {
                ws.send(messageString);
            } else {
                logger.error(`Invalid WebSocket for user ${username}`);
            }
        });
    }

    for (const [visitorId, { ws }] of activeVisitors) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for visitor ${visitorId}`);
        }
    }
};

module.exports = {
    broadcastSensorActivity,
};