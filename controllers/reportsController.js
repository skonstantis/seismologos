const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");

const getReports = async (req, res) => {
  const db = req.app.locals.db;
  const page = parseInt(req.query.p) || 0;
  const elementsPerPage = 10;

  try {
    const elements = await db.collection("reports")
      .find() 
      .skip(page * elementsPerPage)
      .limit(elementsPerPage)
      .sort()
      .toArray();
    res.status(200).json(elements);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res.status(500).json({ error: "ERROR: Could not fetch documents" });
  }
};

const getReportById = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const doc = await db.collection("reports").findOne({ _id: new ObjectId(id) });
    if (!doc) {
      res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    } else {
      res.status(200).json(doc);
    }
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res.status(500).json({ error: "ERROR: Could not fetch document" });
  }
};

const createReport = async (req, res) => {
  const db = req.app.locals.db;
  const report = req.body;

  const now = Date.now();
  report.timestamp = {
    created: now,
    updated: [],
    deleted: [],
    revived: []
  };

  try {
    const result = await db.collection('reports').insertOne(report);
    res.status(201).json(result);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ error: 'ERROR: Could not create document' });
  }
};

const updateReport = async (req, res) => {
  const db = req.app.locals.db;
  const updates = req.body;
  const id = req.params.id;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "ERROR: No update fields provided" });
  }

  try {
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    }

    const now = Date.now();
    const creationTime = report.timestamp.created;
    const updateLimit = 3600000; 

    if (now - creationTime > updateLimit) {
      return res.status(400).json({ error: "ERROR: Report can only be updated within 60 minutes of creation" });
    }

    if (report.timestamp.deleted.length > 0) {
      return res.status(400).json({ error: "ERROR: Cannot update a deleted report" });
    }

    updates.timestamp = { ...report.timestamp, updated: [...report.timestamp.updated, now] };

    const result = await db.collection("reports").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    res.status(200).json(result);
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not update document" });
  }
};

const deleteReport = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    }

    if (report.timestamp.deleted.length > 0) {
      return res.status(400).json({ error: "ERROR: Report already deleted" });
    }

    const now = Date.now();
    const result = await db.collection("reports").updateOne(
      { _id: new ObjectId(id) },
      { $push: { "timestamp.deleted": now } } 
    );

    res.status(200).json(result);
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not delete document" });
  }
};

const reviveReport = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const report = await db.collection("reports").findOne({ _id: new ObjectId(id) });

    if (!report) {
      return res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    }

    const now = Date.now();
    if (report.timestamp.created + 600000 < now) { 
      return res.status(400).json({ error: "ERROR: Report can only be revived within 10 minutes of creation" });
    }

    if (report.timestamp.deleted.length === 0) {
      return res.status(400).json({ error: "ERROR: Report is not deleted" });
    }

    const result = await db.collection("reports").updateOne(
      { _id: new ObjectId(id) },
      { $push: { "timestamp.revived": now }, $set: { "timestamp.deleted": [] } }
    );

    res.status(200).json(result);
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not revive document" });
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  console.error(reason.stack || reason);
});

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport,
  reviveReport
};