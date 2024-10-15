exports.broadcastActivity = (logger, activeUsers, activeVisitors) => {
    const messageWithActivityStatus = {
        userStatuses: []
    };

    for (const [username, { ws, lastActive }] of activeUsers) {
        const elapsedTime = Date.now() - lastActive;
        let status = 'active now';
        if (lastActive !== 0) {
            status = `active ${Math.floor(elapsedTime / 60000)} min ago`;
        }
        messageWithActivityStatus.userStatuses.push({ username, status });
    }

    const messageString = JSON.stringify(messageWithActivityStatus);

    for (const [username, { ws }] of activeUsers) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for user ${username}`);
        }
    }

    for (const [visitorId, ws] of activeVisitors) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for visitor ${visitorId}`);
        }
    }
};
