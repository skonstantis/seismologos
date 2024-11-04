const activeUsersHandler = require('./activeUsers');
const activeVisitorsHandler = require('./activeVisitors');
const activeSensorsHandler = require('./activeSensors');
const { v4: uuidv4 } = require('uuid');

module.exports = (ws, req, db, logger, activeUsers, activeVisitors, activeSensors) => {
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
        case 'activeSensors':
            activeSensorsHandler(activeVisitors, activeUsers, activeSensors, ws, req, db, logger);
            break;
        default:
            logger.warn(`Unknown WebSocket path: ${req.url}`);
            ws.close(4000, "Unknown WebSocket path");
            break;
    }
};


