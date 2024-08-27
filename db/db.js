const { MongoClient } = require("mongodb");
require('dotenv').config();
const { logger } = require("../config/logger");

let dbConnection;
let dbClient; 
const uri = process.env.MONGODB_URI;

module.exports = {
  dbConnect: async (cb) => {
    if (dbConnection) {
      logger.info("Already connected to the database.");
      return cb(null, dbConnection);
    }

    try {
      dbClient = await MongoClient.connect(uri); 
      dbConnection = dbClient.db(); 
      return cb(null, dbConnection);
    } catch (err) {
      logger.error("Failed to connect to the database", err);
      return cb(err);
    }
  },

  dbGet: () => {
    if (!dbConnection) {
      logger.error("Database not connected. Call dbConnect first.");
      throw new Error("Database not connected.");
    }
    return dbConnection;
  },

  dbClose: async () => {
    if (dbClient) {
      await dbClient.close(); 
      dbClient = null;
      dbConnection = null;
      logger.info("Database connection closed.");
    } else {
      logger.info("No database connection to close.");
    }
  }
};
