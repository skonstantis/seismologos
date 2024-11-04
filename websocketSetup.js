const WebSocket = require("ws");
const websocketRouter = require('./websocket');

module.exports = (httpServer, db, logger, activeUsers, activeVisitors, activeSensors) => {
  const wsServer = new WebSocket.Server({ server: httpServer });

  wsServer.on("connection", (ws, req) => {
    websocketRouter(ws, req, db, logger, activeUsers, activeVisitors, activeSensors);
  });
};
