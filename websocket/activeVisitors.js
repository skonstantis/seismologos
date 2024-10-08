const activeVisitors = new Map();

module.exports = async (ws, req, db, logger, visitorId) => {
    try {
        logger.info(`Visitor ${visitorId} connected to the WebSocket`);

        activeVisitors.set(visitorId, ws);

        await db.collection("stats").updateOne({}, { $set: { activeVisitors: activeVisitors.size } });

        ws.on("message", (message) => {
        });

        ws.on("close", async () => {
            activeVisitors.delete(visitorId);
            logger.info(`Visitor ${visitorId} disconnected from the WebSocket`);
            await db.collection("stats").updateOne({}, { $set: { activeVisitors: activeVisitors.size } });
        });

        ws.on("error", (error) => {
            logger.error(`WebSocket error for visitor ${visitorId}:`, error);
            activeVisitors.delete(visitorId);
            db.collection("stats").updateOne({}, { $set: { activeVisitors: activeVisitors.size } });
        });
    } catch (error) {
        logger.error("WebSocket error:", error);
        ws.close(4000, "Internal server error");
    }
};
