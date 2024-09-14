const { logger } = require("../config/logger");

const validateUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  const errors = req.validationErrors || [];

  try {
    const existingUser = await db.collection('users').findOne({ username: user.username });
    if (existingUser) {
      if(username != '')
        errors.push({ msg: 'ERROR: Username already exists'});
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    res.status(200).json([]);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ msg: 'ERROR: Could not validate document' });
  }
};

module.exports = {
    validateUser
};
