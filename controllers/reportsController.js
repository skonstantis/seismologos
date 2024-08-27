const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");

const getReports = async (req, res) => {
  const db = req.app.locals.db;
  const page = req.query.p || 0;
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
    logger.error("Database error:", err);
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
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not fetch document" });
  }
};

const createReport = async (req, res) => {
  const db = req.app.locals.db;
  const report = req.body;

  try {
    const result = await db.collection('reports').insertOne(report);
    res.status(201).json(result);
  } catch (err) {
    logger.error('Database error:', err);
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
    const result = await db.collection("reports").updateOne({ _id: new ObjectId(id) }, { $set: updates });
    if (result.matchedCount === 0) {
      res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not update document" });
  }
};

const deleteReport = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const result = await db.collection("reports").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      res.status(404).json({ error: "NOT FOUND: No report found with such id" });
    } else {
      res.status(200).json(result);
    }
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not delete document" });
  }
};

module.exports = {
  getReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport
};
