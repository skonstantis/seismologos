const jwt = require("jsonwebtoken");

module.exports = async (activeUsers, ws, req, db, logger) => {
    const [path, query] = req.url.split("?");
    const pathSegments = path.split("/");
    const username = pathSegments.pop();

    const tokenParams = new URLSearchParams(query);
    const token = tokenParams.get("token");

    if (!token) {
        ws.close(4000, "Unauthorized: Token is required");
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);

        if (decoded.username !== username) {
            ws.close(4001, "Unauthorized: Invalid username");
            return;
        }

        activeUsers.set(username, { ws });

        await db.collection("stats").updateOne({}, { $set: { activeUsers: activeUsers.size } });

        const currentStats = await db.collection("stats").findOne({});
        broadcastMessage(currentStats, logger);

        ws.on("message", async (message) => {
            
        });

        ws.on("close", async () => {
            const lastActiveTime = new Date().getTime();
            activeUsers.delete(username);

            await db.collection("stats").updateOne({}, { $set: { activeUsers: activeUsers.size } });

            await db.collection("users").updateOne(
                { username: username },
                { $set: { active: lastActiveTime } }
            );

            const updatedStats = await db.collection("stats").findOne({});
            broadcastMessage(updatedStats, logger);
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

const broadcastMessage = (message, logger) => {
    const messageString = JSON.stringify(message);
    for (const [username, { ws }] of activeUsers) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for user ${username}`);
        }
    }
    for (const [visitorId, ws] of activeVisitors) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            logger.error(`Invalid WebSocket for visitor ${visitorId}`);
        }
    }
};
