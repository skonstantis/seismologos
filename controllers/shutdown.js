const { dbClose } = require("../db/db");
const { logger } = require("../config/logger");

const shutdown = async () => {
  logger.info("Received shutdown signal, shutting down...");
  try {
    await dbClose();
    logger.info("Database connection closed.");
    process.exit(0);
  } catch (err) {
    logger.error("Error closing database connection:", err);
    process.exit(1);
  }
};

module.exports = shutdown;