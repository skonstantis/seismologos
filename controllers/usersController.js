const bcrypt = require('bcrypt');
const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");

const getUsers = async (req, res) => {
  const db = req.app.locals.db;
  const page = parseInt(req.query.p) || 0;
  const elementsPerPage = 10;

  try {
    const elements = await db.collection("users")
      .find({}, { projection: { password: 0 } })
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

const getUserById = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const doc = await db.collection("users").findOne(
      { _id: new ObjectId(id) }, 
      { projection: { password: 0 } }
    );
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

const createUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;

  const now = Date.now();
  user.created = now;

  try {
    const existingUser = await db.collection('users').findOne({ username: user.username });
    if (existingUser) {
      return res.status(400).json({ error: 'ERROR: Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;

    const result = await db.collection('users').insertOne(user);
    res.status(201).json(result);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ error: 'ERROR: Could not create document' });
  }
};

const updateUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword, ...updates } = req.body;
  const id = req.params.id;

  if (!currentPassword) {
    return res.status(400).json({ error: "ERROR: Current password must be provided" });
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "ERROR: No update fields provided" });
  }

  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ error: "NOT FOUND: No user found with such id" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(403).json({ error: "ERROR: Current password is incorrect" });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: updates }
    );

    res.status(200).json(result);
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not update document" });
  }
};

const deleteUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword } = req.body; 
  const id = req.params.id;

  if (!currentPassword) {
    return res.status(400).json({ error: "ERROR: Current password must be provided" });
  }

  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ error: "NOT FOUND: No user found with such id" });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(403).json({ error: "ERROR: Current password is incorrect" });
    }

    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    res.status(200).json(result);
  } catch (err) {
    logger.error("Database error:", err);
    res.status(500).json({ error: "ERROR: Could not delete document" });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};