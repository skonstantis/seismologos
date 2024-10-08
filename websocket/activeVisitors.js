const activeVisitors = new Map();

module.exports = async (ws, req, db, logger, visitorId) => {
    try {
        logger.info(`Visitor ${visitorId} connected to the WebSocket`);

        activeVisitors.set(visitorId, ws);

        await db.collection("stats").updateOne({}, { $set: { activeVisitors: activeVisitors.size } });

        const currentStats = await db.collection("stats").findOne({});
        
        broadcastMessage(currentStats);

        ws.on("message", (message) => {
            logger.info(`Message from visitor ${visitorId}: ${message}`);
        });

        ws.on("close", async () => {
            activeVisitors.delete(visitorId); 
            logger.info(`Visitor ${visitorId} disconnected from the WebSocket`);

            await db.collection("stats").updateOne({}, { $set: { activeVisitors: activeVisitors.size } });

            const currentStats = await db.collection("stats").findOne({});
            broadcastMessage(currentStats);
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

const broadcastMessage = (message) => {
    const messageString = JSON.stringify(message); 
    for (const [visitorId, ws] of activeVisitors) {
        if (ws && typeof ws.send === 'function') {
            ws.send(messageString);
        } else {
            console.error(`Invalid WebSocket for visitor ${visitorId}`);
        }
    }
};
