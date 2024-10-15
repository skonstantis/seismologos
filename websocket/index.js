const activeUsersHandler = require('./activeUsers');
const activeVisitorsHandler = require('./activeVisitors');
const { v4: uuidv4 } = require('uuid'); 

const activeUsers = new Map();
const activeVisitors = new Map();

module.exports = (ws, req, db, logger) => {
    const pathSegments = req.url.split('/');
    const basePath = pathSegments[pathSegments.length - 2]; 

    switch (basePath) {
        case 'activeUsers':
            activeUsersHandler(activeUsers, activeVisitors, ws, req, db, logger);
            break;
        case 'activeVisitors':
            const visitorId = uuidv4();
            activeVisitorsHandler(activeVisitors, activeUsers, ws, req, db, logger, visitorId);
            break;
        default:
            logger.warn(`Unknown WebSocket path: ${req.url}`);
            ws.close(4000, "Unknown WebSocket path");
            break;
    }

    setInterval(async () => {
        const stats = await db.collection("stats").findOne({});
        broadcastMessage(stats, logger, activeUsers, activeVisitors);
    }, 60000);
};

const broadcastMessage = (message, logger, activeUsers, activeVisitors) => {
    const messageWithActivityStatus = {
        ...message,
        userStatuses: []
    };

    for (const [username, { ws, lastActive }] of activeUsers) {
        const elapsedTime = Date.now() - lastActive;
        let status = `${Math.floor(elapsedTime / 60000)}`; 
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
