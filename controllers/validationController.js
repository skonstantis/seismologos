const { logger } = require("../config/logger");
const { ObjectId } = require("mongodb");
const jwt = require('jsonwebtoken');
const { sendVerifiedEmail, sendPasswordChangedEmail, sendForgotPasswordEmail } = require("./emailController");
const bcrypt = require("bcrypt");

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

    try {
      await sendVerifiedEmail(user.email, user.username);
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
    }
    return res.redirect('https://seismologos.netlify.app/login?verified=true');
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

    const newToken = jwt.sign({ userId: user._id }, process.env.JWT_LOGIN_SECRET, { expiresIn: '6h' });

    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          loginTokens: [...validTokens, newToken]
        }
      }
    );

    res.json({ token: newToken, msg: "Session extended", user: { id: user._id, username: user.username, email: user.email, lastLogin: user.lastLogin } });
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res.status(500).json({ errors: [{ msg: "DATABASE ERROR: Could not access document" }] });
  }
};

const changePassword = async (req, res) => {
  const db = req.app.locals.db;
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ errors: [{ msg: 'Token is missing' }] });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_PASSWORD_SECRET);
    const {userId, purpose} = decoded; 

    if (purpose !== 'changePassword') {
      return res.status(403).json({ errors: [{ msg: 'Invalid token purpose' }] });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    res.status(200).json('Authorization granted');
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

const changePasswordValidated = async (req, res) => {
  const db = req.app.locals.db;
  const { token, password } = req.body;
  const errors = req.validationErrors || [];

  if (!token) {
    return res.status(400).json({ errors: [{ msg: 'Token is missing' }] });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_PASSWORD_SECRET);
    const { userId, purpose } = decoded;

    if (purpose !== 'changePassword') {
      return res.status(403).json({ errors: [{ msg: 'Invalid token purpose' }] });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ errors: [{ msg: 'User not found' }] });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = {
      ...user,
      password: hashedPassword,
      oldIds: user.oldIds ? [...user.oldIds, user._id] : [user._id], 
      lockedUntil: null,
      _id: new ObjectId() 
    };

    await db.collection('users').insertOne(updatedUser); 

    await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
    
    try {
      await sendPasswordChangedEmail(user.email, user.username); 
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send email' });
    }

    res.status(200).json('Success');
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

const forgotPassword = async (req, res) => {
  const db = req.app.locals.db;
  const { email } = req.body; 
  let errors = req.validationErrors || [];

  try {
    if (!email) {
      return res.status(400).json({ errors: [{ msg: "Η φόρμα είναι άδεια" }] });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const user = await db.collection('users').findOne({ email: email });
    if (user) {
      if(!user.verified)
        return res.status(400).json({ errors: [{ msg: "Η διεύθυνση e-mail σας δεν είναι επιβεβαιωμένη." }] });
      const token = jwt.sign({ userId: user._id, purpose: 'changePassword' }, process.env.JWT_PASSWORD_SECRET, { expiresIn: '1d' });
      try {
        await sendForgotPasswordEmail(user.email, user.username, token); 
      } catch (emailError) {
        logger.error('EMAIL ERROR:', emailError);
        return res.status(500).json({ msg: 'EMAIL ERROR: Could not send email' });
      }
    }

    res.status(200).json([]);
  } catch (err) {
    logger.error('DATABASE ERROR:', err);
    res.status(500).json({ msg: 'DATABASE ERROR: Could not validate document' });
  }
};


module.exports = {
  validateUser,
  verifyEmail, 
  validateSession,
  changePassword,
  changePasswordValidated,
  forgotPassword
};