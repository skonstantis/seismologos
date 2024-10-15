const broadcastActivity = async (logger, db, activeUsers, activeVisitors) => {
    const messageWithActivityStatus = {
        userStatuses: []
    };

    try {
        const users = await db.collection('users').find({
            'verified': { $exists: true },
            'login.last': { $ne: null }
        }).toArray();

        for (const user of users) {
            const username = user.auth.username;
            const lastActive = user.activity.active;
            const elapsedTime = Date.now() - lastActive;
            if(elapsedTime < 7 * 24 * 60 * 60 * 60 * 1000)
            {
                messageWithActivityStatus.userStatuses.push({ username, elapsedTime });
            }
        }
    } catch (error) {
        logger.error("Error fetching users from database:", error);
    }

    const messageString = JSON.stringify(messageWithActivityStatus);

    for (const [username, { ws }] of activeUsers) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for user ${username}`);
        }
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
    broadcastActivity,
};