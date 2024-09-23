const { logger } = require("../config/logger");
const { ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');

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
      
    if (!user.username || !user.email || !user.password) {
      if(!user.username)
        errors = errors.filter(error => error.path !== "username");
      if(!user.email)
        errors = errors.filter(error => error.path !== "email");  
      if(!user.password)
        errors = errors.filter(error => error.path !== "password");
      errors.push({ msg: 'Συμπληρώστε όλα τα πεδία της φόρμας'});
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

const verifyEmail = async (req, res) => {
  const db = req.app.locals.db;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ errors: [{ msg: 'Token is missing' }] });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId; 

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    if (user.verified) {
      return res.status(400).json({ errors: [{ msg: 'Email is already verified' }] });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          verified: Date.now()
        },
        $unset: {
          threeDaysVerificationNotification: "",
          oneDayVerificationNotification: ""
        }
      }
    );

    res.status(200).send('Email verified successfully!');
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ errors: [{ msg: 'Token has expired' }] });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ errors: [{ msg: 'Invalid token' }] });
    }
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ errors: [{ msg: 'DATABASE ERROR: Could not verify email' }] });
  }
};

module.exports = {
  validateUser,
  verifyEmail
};