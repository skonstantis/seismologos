const jwt = require("jsonwebtoken");
const { broadcastStats } = require("./broadcasts/broadcastStats");
const { broadcastActivity } = require("./broadcasts/broadcastActivity");

module.exports = async (activeUsers, activeVisitors, ws, req, db, logger) => {
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

        activeUsers.set(username, { ws, lastActive: Date.now() });

        await db.collection("stats").updateOne({}, { $set: { 'active.users': activeUsers.size } });

        await db.collection("users").updateOne(
            { 'auth.username': username },
            { $set: { 'activity.active': 0 } }
        );

        const currentStats = await db.collection("stats").findOne({});
        broadcastStats(currentStats, logger, activeUsers, activeVisitors);

        broadcastActivity(logger, db, activeUsers, activeVisitors);

        ws.on("message", async (message) => {
        });

        ws.on("close", async () => {
            const lastActiveTime = new Date().getTime();
            activeUsers.delete(username);

            await db.collection("stats").updateOne({}, { $set: { 'active.users': activeUsers.size } });

            await db.collection("users").updateOne(
                { 'auth.username': username },
                { $set: { 'activity.active': lastActiveTime } }
            );

            const updatedStats = await db.collection("stats").findOne({});
            broadcastStats(updatedStats, logger, activeUsers, activeVisitors);
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
