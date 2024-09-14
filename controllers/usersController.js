const bcrypt = require('bcrypt');
const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");

const getUsers = async (req, res) => {
  const db = req.app.locals.db;
  const page = parseInt(req.query.p) || 0;
  const elementsPerPage = 10;
  const errors = req.validationErrors || [];

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
    errors.push({ msg: 'ERROR: Could not fetch documents', param: '', location: 'internal' });
    res.status(500).json({ errors });
  }
};

const getUserById = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;
  const errors = req.validationErrors || [];

  try {
    const doc = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );
    if (!doc) {
      errors.push({ msg: 'NOT FOUND: No report found with such id', param: 'id', location: 'params' });
      return res.status(404).json({ errors });
    } else {
      res.status(200).json(doc);
    }
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    errors.push({ msg: 'ERROR: Could not fetch document', param: '', location: 'internal' });
    res.status(500).json({ errors });
  }
};


const createUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  const errors = [];

  const now = Date.now();
  user.created = now;

  try {
    const existingUser = await db.collection('users').findOne({ username: user.username });
    if (existingUser) {
      errors.push({msg: 'ERROR: Username already exists'});
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;

    const result = await db.collection('users').insertOne(user);
    res.status(201).json(result);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ errors: ['ERROR: Could not create document'] });
  }
};

const validateNewUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  const errors = req.validationErrors || [];

  try {
    const existingUser = await db.collection('users').findOne({ username: user.username });
    if (existingUser) {
      errors.push({ msg: 'ERROR: Username already exists'});
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    res.status(200).json([]);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    errors.push({ msg: 'ERROR: Could not validate document', param: '', location: 'internal' });
    res.status(500).json({ errors });
  }
};


const updateUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword, ...updates } = req.body;
  const id = req.params.id;
  const errors = req.validationErrors || [];

  if (!currentPassword) {
    errors.push({ msg: 'ERROR: Current password must be provided', param: 'currentPassword', location: 'body' });
  }

  if (Object.keys(updates).length === 0) {
    errors.push({ msg: 'ERROR: No update fields provided', param: '', location: 'body' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

    if (!user) {
      errors.push({ msg: 'NOT FOUND: No user found with such id', param: 'id', location: 'params' });
      return res.status(404).json({ errors });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      errors.push({ msg: 'ERROR: Current password is incorrect', param: 'currentPassword', location: 'body' });
      return res.status(403).json({ errors });
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
    logger.error("DATABASE ERROR:", err);
    errors.push({ msg: 'ERROR: Could not update document', param: '', location: 'internal' });
    res.status(500).json({ errors });
  }
};

const deleteUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword } = req.body;
  const id = req.params.id;
  const errors = req.validationErrors || [];

  if (!currentPassword) {
    errors.push({ msg: 'ERROR: Current password must be provided', param: 'currentPassword', location: 'body' });
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  try {
    const user = await db.collection("users").findOne({ _id: new ObjectId(id) });

    if (!user) {
      errors.push({ msg: 'NOT FOUND: No user found with such id', param: 'id', location: 'params' });
      return res.status(404).json({ errors });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      errors.push({ msg: 'ERROR: Current password is incorrect', param: 'currentPassword', location: 'body' });
      return res.status(403).json({ errors });
    }

    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) });

    res.status(200).json(result);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    errors.push({ msg: 'ERROR: Could not delete document', param: '', location: 'internal' });
    res.status(500).json({ errors });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  validateNewUser,
  updateUser,
  deleteUser
};
