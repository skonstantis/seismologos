const jwt = require("jsonwebtoken"); 

const activeUsers = new Map();

module.exports = (ws, req, db, logger) => {
    const [path, query] = req.url.split("?");

    const pathSegments = path.split("/");
    const username = pathSegments.pop(); 
  
    const tokenParams = new URLSearchParams(query);
    const token = tokenParams.get("token");
  
    if (!token) {
      logger.info("1 " + username + " " + token);
      ws.close(4000, "Unauthorized: Token is required"); 
      return;
    }

  try {
    const decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);

    if (decoded.username !== username) {
      logger.info("2 " + username + " " + token);
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
