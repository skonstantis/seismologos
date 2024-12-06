const broadcastSensorConnection = (which, type, logger, activeUsers, activeVisitors) => {
    const whichString = JSON.stringify(which); 
    for (const [username, connections] of activeUsers) {
        connections.forEach(({ ws }) => {
            if (ws && typeof ws.send === 'function') {
                ws.send(whichString);
            } else {
                logger.error(`Invalid WebSocket for user ${username}`);
            }
        });
    }
    for (const [visitorId, { ws }] of activeVisitors) {
        if (ws && typeof ws.send === 'function') {
            ws.send(whichString);
        } else {
            logger.error(`Invalid WebSocket for visitor ${visitorId}`);
        }
    }
};

module.exports = {
    broadcastSensorConnection,
};