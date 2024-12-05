const broadcastNewSensorData = (id, data, logger, activeUsers, activeVisitors) => {
    const messageString = JSON.stringify({credentials: id, sensorData: data}); 
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
    broadcastNewSensorData,
};