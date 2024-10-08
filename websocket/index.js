const activeUsersHandler = require('./activeUsers');
const activeVisitorsHandler = require('./activeVisitors');
const { v4: uuidv4 } = require('uuid'); 

module.exports = (ws, req, db, logger) => {
  const pathSegments = req.url.split('/');
  const basePath = pathSegments[pathSegments.length - 2]; 

  switch (basePath) {
    case 'activeUsers':
      activeUsersHandler(ws, req, db, logger);
      break;
    case 'activeVisitors':
      const visitorId = uuidv4();
      activeVisitorsHandler(ws, req, logger, visitorId);
      break;
    default:
      logger.warn(`Unknown WebSocket path: ${req.url}`);
      ws.close(4000, "Unknown WebSocket path");
      break;
  }
};
