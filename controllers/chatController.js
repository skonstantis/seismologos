const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");
const { messageFields } = require("../utils/messageFields");
const { broadcastNewChatMessage } = require("../websocket/broadcasts/broadcastNewChatMessage");

const getLastMessageId = async (req, res) => {
  const db = req.app.locals.db;
  const messageCount = await db.collection('messages').countDocuments();
  res.status(200).json(messageCount);
};

const createMessage = async (req, res) => {
  const db = req.app.locals.db;
  const { token, id, username, message } = req.body;
  const errors = req.validationErrors || [];

  try {
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (!token || !id || !username || !message) {
      return res.status(400).json({ errors: [{ msg: "Invalid request" }] });
    }

    let user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });

    if (!user) {      
      user = await db
        .collection("users")
        .findOne({ "auth.username": username });
      if (!user) {
        return res.status(404).json({ errors: [{ msg: "User not found" }] });
      } else {
        if (!user.ids.old || !user.ids.old.includes(new ObjectId(id))) {
          return res.status(404).json({ errors: [{ msg: "User not found" }] });
        }
      }
    }

    if (!user.login.tokens || !user.login.tokens.includes(token)) {
      return res.status(400).json({ errors: [{ msg: "Token not found" }] });
    }

    const messageCount = await db.collection('messages').countDocuments();
    const newMessageId = messageCount + 1;

    const now = Date.now();
    const newMessage = {
      id: newMessageId,
      user: new ObjectId(id),
      username: username,
      message: message,
      created: now,
      edited: []
    };

    const result = await db.collection('messages').insertOne(newMessage);

    broadcastNewChatMessage({ created: now, username: username, message: message, id: newMessageId }, logger, req.app.locals.activeUsers, req.app.locals.activeVisitors);

    res.status(200).json({ msg: "Successfully created message", messageId: newMessageId });
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not create document" }] });
  }
};

const getMessage = async (req, res) => {
  const db = req.app.locals.db;
  const id = parseInt(req.query.id) || null;

  try {
    if (isNaN(id)) {
      return res.status(400).json({ errors: [{ msg: "Invalid request" }] });
    }

    let message = await db
      .collection("messages")
      .findOne({ id: id });

    if (!message) {
      return res.status(400).json({ errors: [{ msg: "Message not found" }] });
    }

    res.status(200).json({ message: message });
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not create document" }] });
  }
};

const getMessagesBetween = async (req, res) => {
  const db = req.app.locals.db;
  const from = parseInt(req.query.from);
  const to = parseInt(req.query.to);

  try {
    if (isNaN(from) || isNaN(to)) {
      return res.status(400).json({ errors: [{ msg: "Invalid request" }] });
    }

    const messages = await db
      .collection("messages")
      .find({ id: { $gte: from, $lte: to } })
      .toArray();

    if (messages.length === 0) {
      return res.status(404).json({ errors: [{ msg: "No messages found in the specified range" }] });
    }

    res.status(200).json({ messages });
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not retrieve documents" }] });
  }
};

module.exports = {
  createMessage,
  getLastMessageId,
  getMessage,
  getMessagesBetween
};
