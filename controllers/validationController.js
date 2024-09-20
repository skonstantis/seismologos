const { logger } = require("../config/logger");

const validateUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  let errors = req.validationErrors || [];

  try {
    if (user.username && await db.collection('users').findOne({ username: user.username })) {
      errors.push({ msg: 'Το όνομα χρήστη ' + user.username + " χρησιμοποιείται ήδη"});
    }

    if (user.email && await db.collection('users').findOne({ email: user.email })) {
      errors.push({ msg: 'Το email ' + user.email + " χρησιμοποιείται ήδη"});
    }
      
    if (!user.username) {
      errors = errors.filter(error => error.path !== "username");
      errors.push({ msg: 'Το όνομα χρήστη δεν μπορεί να είναι κενό'});
    }

    if (!user.email) {
      errors = errors.filter(error => error.path !== "email");
      errors.push({ msg: 'Το email δεν μπορεί να είναι κενό'});
    }

    if (!user.password) {
      errors = errors.filter(error => error.path !== "password");
      errors.push({ msg: 'Ο κωδικός πρόσβασης δεν μπορεί να είναι κενός'});
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
