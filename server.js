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
const { buildQuery } = require("./helpers/buildQuery");
const { statsFields } = require("./utils/statsFields");

const port = process.env.PORT || 3000;
const server = express();

server.use(cors());
server.set("trust proxy", 1);
server.use(helmet());
server.use(express.json());
server.use(limiter);

const activeUsers = new Map();
const activeVisitors = new Map();
const activeSensors = new Map();

server.locals.activeUsers = activeUsers;
server.locals.activeVisitors = activeVisitors;
server.locals.activeSensors = activeSensors;

dbConnect(async (err, database) => {
  if (!err) {
    server.locals.db = database;

    try {
      const statsCollection = database.collection("stats");
      await statsCollection.updateOne({}, buildQuery(statsFields), { upsert: true });

      const httpServer = server.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
      });

      require('./websocketSetup')(httpServer, server.locals.db, logger, activeUsers, activeVisitors, activeSensors);

      cron.schedule("* * * * *", async () => {
        try {
          await handleUnverifiedUsers(server.locals.db);
        } catch (error) {
          logger.error("Error deleting expired users:", error);
        }
      });

    } catch (error) {
      logger.error("Failed to initialize loggedInUsers", error);
      process.exit(1);
    }
  } else {
    logger.error("Failed to connect to the database", err);
    process.exit(1);
  }
});

server.use("/", routes);

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = server; 