const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");
const { messageFields } = require("../utils/messageFields");

const createMessage = async (req, res) => {
  const db = req.app.locals.db;
  const { token, id, username, message } = req.body;
  const errors = req.validationErrors || [];

  try {
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    if (!token || !id || !username || !message) {
      return res.status(400).json({ errors: [{ msg: "Μή έγκυρο αίτημα" }] });
    }

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });

      
  logger.info(`token ${token} id ${id} username ${username} message ${message}`);

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
    
  logger.info(`token ${token} id ${id} username ${username} message ${message}`);

    if (!user.login.tokens || !user.login.tokens.includes(token)) {
      return res.status(400).json({ errors: [{ msg: "Token not found" }] });
    }
    
  logger.info(`token ${token} id ${id} username ${username} message ${message}`);

    const insertedMessage = {
        ...messageFields.$set,
      };
      
      const result = await db.collection('messages').insertOne(insertedMessage);
  
      await db.collection('messages').updateOne(
        { _id: result.insertedId },
        {
          $set: {
            'user': id,
            'message': message,
          }
        }
      );

    res.status(200).json({ msg: "Successfully created message" });
  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not create document" }] });
  }
};

module.exports = {
  createMessage,
};
