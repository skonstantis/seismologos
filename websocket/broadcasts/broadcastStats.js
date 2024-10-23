const broadcastStats = (message, logger, activeVisitors, activeUsers) => {
    const messageString = JSON.stringify(message); 
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
    broadcastStats,
};