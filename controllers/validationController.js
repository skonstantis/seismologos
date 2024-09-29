const { logger } = require("../config/logger");
const { ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const { sendVerifiedEmail } = require("./emailController");

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
    const decoded = jwt.verify(token, process.env.JWT_VERIFICATION_SECRET);
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
          verified: Date.now(),
          lastLogin: null,
          timesLoggedIn: 0,
          wrongPassword: 0,
          lockedUntil: null,
          loginTokens: []
        },
        $unset: {
          threeDaysVerificationNotification: "",
          oneDayVerificationNotification: ""
        }
      }
    );

    sendVerifiedEmail(user.email, user.username);

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

const validateSession = async (req, res) => {
  const db = req.app.locals.db;
  const { token } = req.body || {};

  try {
    if (!token) {
      return res.status(400).json({ errors: [{ msg: "ERROR: Token is missing" }] });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_LOGIN_SECRET);
    } catch (err) {
      return res.status(401).json({ errors: [{ msg: "ERROR: Invalid token" }] });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });

    if (!user) {
      return res.status(404).json({ errors: [{ msg: "ERROR: User not found" }] });
    }

    if (!user.loginTokens.includes(token)) {
      return res.status(401).json({ errors: [{ msg: "ERROR: Token is not valid" }] });
    }

    const validTokens = user.loginTokens.filter((userToken) => {
      try {
        return userToken !== token && jwt.verify(userToken, process.env.JWT_LOGIN_SECRET);
      } catch (err) {
        return false;
      }
    });

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_LOGIN_SECRET, { expiresIn: '1h' });

    const lastLogin = user.lastLogin;

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          lastLogin: Date.now(),
          loginTokens: [...validTokens, newToken]
        }
      }
    );

    res.json({ token: newToken, msg: "Session extended", user: { id: user._id, username: user.username, email: user.email, lastLogin: lastLogin } });
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res.status(500).json({ errors: [{ msg: "DATABASE ERROR: Could not access document" }] });
  }
};




module.exports = {
  validateUser,
  verifyEmail, 
  validateSession
};