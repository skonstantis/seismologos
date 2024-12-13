const broadcastSensorActivity = async (logger, db, activeUsers, activeVisitors) => {
    const messageWithSensorActivityStatus = {
        sensorStatuses: []
    };

    try {
        const sensors = await db.collection('sensors').find({}, {
            projection: { 'id': 1, 'active': 1, 'lat': 1, 'lon': 1 }
        }).toArray();

        for (const sensor of sensors) {
            const { id, active, lat, lon } = sensor;
            const activeStatus = active === 0 ? true : false;
            messageWithSensorActivityStatus.sensorStatuses.push({ id, active: activeStatus, lat, lon });
        }
    } catch (error) {
        logger.error("Error fetching sensors from database:", error);
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
