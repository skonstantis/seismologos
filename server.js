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
const websocketRouter = require('./websocket');

const port = process.env.PORT || 3000;
const server = express();

server.use(cors());
server.set("trust proxy", 1);
server.use(helmet());
server.use(express.json());
server.use(limiter);

dbConnect((err, database) => {
  if (!err) {
    server.locals.db = database;

    const httpServer = server.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
    });

    const wsServer = new WebSocket.Server({ server: httpServer });

    wsServer.on("connection", (ws, req) => {
      websocketRouter(ws, req, server.locals.db, logger);
    });

    cron.schedule("* * * * *", async () => {
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