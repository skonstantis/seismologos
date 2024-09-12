const express = require("express");
const { dbConnect } = require("./db/db");
const helmet = require("helmet");
//const cors = require("cors");
const { logger } = require("./config/logger");
const { limiter } = require("./config/rateLimiter");
const routes = require("./routes");
const shutdown = require("./controllers/shutdown");

const port = process.env.PORT || 3000;
const server = express();

// server.use(cors({
//   origin: 'https://seismologos.netlify.app',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
// }));

server.set('trust proxy', 1);

server.use(helmet());

server.use(express.json());

server.use(limiter);

dbConnect((err, database) => {
  if (!err) {
    server.locals.db = database;
    server.listen(port, () => {
      logger.info(`Server listening on port ${port}`);
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
