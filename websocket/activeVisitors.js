const { broadcastStats } = require("./broadcasts/broadcastStats");
const { broadcastActivity } = require("./broadcasts/broadcastActivity");
const { broadcastSensorActivity } = require("./broadcasts/broadcastSensorActivity");

module.exports = async (activeVisitors, activeUsers, ws, req, db, logger, visitorId) => {
    try {
        activeVisitors.set(visitorId, { ws, lastActive: Date.now() });

        await db.collection("stats").updateOne({}, { $set: { 'active.visitors': activeVisitors.size } });

        const currentStats = await db.collection("stats").findOne({});
        broadcastStats(currentStats, logger, activeVisitors, activeUsers);
        
        const visitorData = activeVisitors.get(visitorId);
        const visitorDataMap = new Map();
        visitorDataMap.set(visitorId, visitorData);
        broadcastActivity(logger, db, new Map(), visitorDataMap);
        broadcastSensorActivity(logger, db, new Map(), visitorDataMap);


        ws.on("message", (message) => {
        });

        ws.on("close", async () => {
            activeVisitors.delete(visitorId);

            await db.collection("stats").updateOne({}, { $set: { 'active.visitors': activeVisitors.size } });

            const currentStats = await db.collection("stats").findOne({});
            broadcastStats(currentStats, logger, activeVisitors, activeUsers);
        });

        ws.on("error", (error) => {
            logger.error(`WebSocket error for visitor ${visitorId}:`, error);
            activeVisitors.delete(visitorId);
            db.collection("stats").updateOne({}, { $set: { 'active.visitors': activeVisitors.size } });
        });
    } catch (error) {
        logger.error("WebSocket error:", error);
        ws.close(4000, "Internal server error");
    }
};