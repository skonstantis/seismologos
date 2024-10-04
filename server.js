const express = require("express");
const { dbConnect } = require("./db/db");
const helmet = require("helmet");
const cors = require("cors");
const { logger } = require("./config/logger");
const { limiter } = require("./config/rateLimiter");
const routes = require("./routes");
const shutdown = require("./controllers/shutdown");
const cron = require("node-cron"); 
const { handleUnverifiedUsers } = require("./controllers/unverifiedUsersController");
const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

const port = process.env.PORT || 3000;
const server = express();

server.use(cors());
server.set("trust proxy", 1);
server.use(helmet());
server.use(express.json());
server.use(limiter);

const activeUsers = new Map();
const MESSAGE_TIMEOUT = 2 * 60 * 1000; 

dbConnect((err, database) => {
  if (!err) {
    server.locals.db = database;

    const httpServer = server.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });

    const userSocket = new WebSocket.Server({ server: httpServer }); 

    userSocket.on('connection', (ws, req) => {
      const visitorId = uuidv4(); 
      logger.info(`Visitor connected: ${visitorId}`);

      ws.send(JSON.stringify({ type: 'visitorId', visitorId }));

      activeUsers.set(visitorId, { ws, lastActive: new Date() });

      let messageTimeout;

      const resetMessageTimeout = () => {
        if (messageTimeout) {
          clearTimeout(messageTimeout);
        }
        messageTimeout = setTimeout(() => {
          logger.info(`Closing connection for ${visitorId} due to inactivity.`); 
          ws.close();
        }, MESSAGE_TIMEOUT);
      };

      resetMessageTimeout();

      ws.on('message', async (message) => {
        if (activeUsers.has(visitorId)) {
          activeUsers.get(visitorId).lastActive = new Date();
          resetMessageTimeout();
        }
      });

      ws.on('close', async () => {
        clearTimeout(messageTimeout);
        activeUsers.delete(visitorId);
        logger.info(`Visitor disconnected: ${visitorId}`); 
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for visitor: ${visitorId}:`, error);
        activeUsers.delete(visitorId);
      });
    });

    cron.schedule('* * * * *', async () => {
      try {
        await handleUnverifiedUsers(server.locals.db); 
      } catch (error) {
        logger.error("Error deleting expired users:", error);
      }
    });

  } else {
    logger.error("Failed to connect to the database", err);
    process.exit(1);
  }
});

server.use("/", routes);

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = server;
