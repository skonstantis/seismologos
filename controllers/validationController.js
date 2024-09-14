const { logger } = require("../config/logger");

const validateUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  let errors = req.validationErrors || [];

  try {
    const existingUser = await db.collection('users').findOne({ username: user.username });
    if (existingUser && user.username) {
      errors.push({ msg: 'Το όνομα χρήστη ' + user.username + " χρησιμοποιείται ήδη"});
    }

    if (!user.password) {
      errors = errors.filter(error => error.path !== "password");
    }
  
    if (!user.username) {
        errors = errors.filter(error => error.path !== "username");
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    res.status(200).json([]);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ msg: 'DATABASE ERROR: Could not validate document' });
  }
};

module.exports = {
    validateUser
};
