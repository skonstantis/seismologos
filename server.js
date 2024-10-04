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
      const username = req.url.split('/').pop(); 
      logger.info(`${username} connected to the WebSocket`); 
      activeUsers.set(username, { ws, lastActive: new Date() });

      let messageTimeout;

      const resetMessageTimeout = () => {
        if (messageTimeout) {
          clearTimeout(messageTimeout);
        }
        messageTimeout = setTimeout(() => {
          logger.info(`Closing connection for ${username} due to inactivity.`); 
          ws.close();
        }, MESSAGE_TIMEOUT);
      };

      resetMessageTimeout();

      ws.on('message', async (message) => {
        if (activeUsers.has(username)) {
          activeUsers.get(username).lastActive = new Date();
          
          await server.locals.db.collection('users').updateOne(
            { username: username },
            { $set: { active: 0 } }
          );

          resetMessageTimeout();
        }
      });

      ws.on('close', async () => {
        clearTimeout(messageTimeout);
        const lastActiveTime = new Date().getTime();
        activeUsers.delete(username);
        
        logger.info(`${username} disconnected from the WebSocket`); 

        await server.locals.db.collection('users').updateOne(
          { username: username },
          { $set: { active: lastActiveTime } }
        );
      });

      ws.on('error', (error) => {
        logger.error(`WebSocket error for ${username}:`, error);
        activeUsers.delete(username);
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
