const WebSocket = require("ws");
const websocketRouter = require('./websocket');

function setupWebSocket(httpServer, db, logger, activeUsers, activeVisitors) {
  const wsServer = new WebSocket.Server({ server: httpServer });

  wsServer.on("connection", (ws, req) => {
    websocketRouter(ws, req, db, logger, activeUsers, activeVisitors);
  });
}

module.exports = { setupWebSocket };