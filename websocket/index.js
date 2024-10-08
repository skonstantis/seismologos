const activeUsersHandler = require('./activeUsers');

module.exports = (ws, req, db, logger) => {
  const pathSegments = req.url.split('/');
  const basePath = pathSegments[pathSegments.length - 2]; 

  switch (basePath) {
    case 'activeUsers':
      activeUsersHandler(ws, req, db, logger);
      break;

    // Add more cases here for different paths
    // case 'anotherPath':
    //   anotherPathHandler(ws, req, db, logger);
    //   break;

    default:
      logger.warn(`Unknown WebSocket path: ${req.url}`);
      ws.close(4000, "Unknown WebSocket path");
      break;
  }
};
