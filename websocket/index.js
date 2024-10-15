const activeUsersHandler = require('./activeUsers');
const activeVisitorsHandler = require('./activeVisitors');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const { broadcastActivity } = require('./broadcasts/broadcastActivity');

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
};

cron.schedule('* * * * *', () => {
    broadcastActivity(logger, activeUsers, activeVisitors);
}, {
    scheduled: true
});
