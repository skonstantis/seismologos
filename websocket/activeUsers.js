const jwt = require("jsonwebtoken"); 

const activeUsers = new Map();

module.exports = (ws, req, db, logger) => {
  const token = req.url.split("?token=")[1]; 
  const username = req.url.split("/").pop(); 

  try {
    const decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);

    if (decoded.username !== username) {
      ws.close(4001, "Unauthorized: Invalid username");
      return;
    }

    logger.info(`${username} connected to the WebSocket`);
    activeUsers.set(username, { ws, lastActive: new Date() });

    ws.on("message", async (message) => {
      if (activeUsers.has(username)) {
        activeUsers.get(username).lastActive = new Date();

        await db.collection("users").updateOne(
          { username: username },
          { $set: { active: 0 } } 
        );
      }
    });

    ws.on("close", async () => {
      const lastActiveTime = new Date().getTime();
      activeUsers.delete(username);

      logger.info(`${username} disconnected from the WebSocket`);

      await db.collection("users").updateOne(
        { username: username },
        { $set: { active: lastActiveTime } } 
      );
    });

    ws.on("error", (error) => {
      logger.error(`WebSocket error for ${username}:`, error);
      activeUsers.delete(username);
    });
  } catch (error) {
    logger.error("WebSocket authentication error:", error);
    ws.close(4000, "Unauthorized: Invalid token");
  }
};
