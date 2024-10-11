const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");
const fetch = require("node-fetch");
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendAccountLockedEmail } = require("./emailController");
const { unverifiedFields, buildUpdateQuery } = require("../utils/userFields");

const getUsers = async (req, res) => {
  const db = req.app.locals.db;
  const page = parseInt(req.query.p) || 0;
  const elementsPerPage = 10;

  try {
    const elements = await db
      .collection("users")
      .find({}, { projection: { username: 1, email: 1, created: 1, verified: 1, lastLogin: 1 } })
      .skip(page * elementsPerPage)
      .limit(elementsPerPage)
      .sort()
      .toArray();
    res.status(200).json(elements);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not fetch documents" }] });
  }
};

const getUserById = async (req, res) => {
  const db = req.app.locals.db;
  const id = req.params.id;

  try {
    const doc = await db
      .collection("users")
      .findOne({ projection: { username: 1, email: 1, created: 1, verified: 1, lastLogin: 1 } });
    if (!doc) {
      return res
        .status(404)
        .json({ errors: [{ msg: "NOT FOUND: No report found with such id" }] });
    } else {
      res.status(200).json(doc);
    }
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not fetch document" }] });
  }
};

const loginUser = async (req, res) => {
  const db = req.app.locals.db;
  const { key, password } = req.body || {};

  try {
    if (!key) {
      return res.status(400).json({ errors: [{ msg: "Εισάγετε Όνομα Χρήστη ή e-mail" }] });
    }

    if (!password) {
      return res.status(400).json({ errors: [{ msg: "Εισάγετε Κωδικό Πρόσβασης" }] });
    }

    const user = await db.collection('users').findOne({
      $or: [{ 'auth.username': key }, { 'auth.email': key }]
    });

    if (!user) {
      return res.status(400).json({
        errors: [{ msg: key.includes("@") ? "Δεν υπάρχει χρήστης με αυτό το e-mail" : "Δεν υπάρχει χρήστης με αυτό το Όνομα Χρήστη" }]
      });
    }

    if (user.verified == null) {
      return res.status(400).json({ errors: [{ msg: "Επιβεβαιώστε τη διεύθυνση e-mail για να ενεργοποιηθεί ο λογαριασμός σας" }] });
    }

    if (user.account.lockedUntil && Date.now() < user.account.lockedUntil) {
      const lockedUntilDate = new Date(user.account.lockedUntil);
      const formattedLockedUntilGreekTime = lockedUntilDate.toLocaleString('el-GR', {
        timeZone: 'Europe/Athens',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      return res.status(403).json({ errors: [{ msg: `Ο λογαριασμός σας είναι κλειδωμένος μέχρι ${formattedLockedUntilGreekTime}` }] });
    }

    if (user.account.lockedUntil) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { 'account.lockedUntil': null } }
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.auth.password);
    if (!passwordMatch) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(user._id) },
        { $inc: { 'password.wrongPassword': 1 } }
      );

      const updatedUser = await db.collection('users').findOne({ _id: new ObjectId(user._id) });

      if (updatedUser.password.wrongPassword >= 10) {
        await db.collection('users').updateOne(
          { _id: new ObjectId(updatedUser._id) },
          { $set: { 'account.lockedUntil': Date.now() + 1000 * 60 * 60 * 24, 'password.wrongPassword': 0, 'login.loginTokens': [] } }
        );
        
        const token = jwt.sign({ userId: user._id, purpose: 'changePassword' }, process.env.JWT_PASSWORD_SECRET, { expiresIn: '1d' });
        try {
          await sendAccountLockedEmail(user.auth.email, user.auth.username, token);
        } catch (emailError) {
          logger.error('EMAIL ERROR:', emailError);
          return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
        }

        return res.status(400).json({ errors: [{ msg: "Ο λογαριασμός σας έχει κλειδωθεί για 24 ώρες" }] });
      }

      if (updatedUser.password.wrongPassword >= 5) {
        return res.status(400).json({ errors: [{ msg: "Ο κωδικός πρόσβασης δεν είναι σωστός. Έχετε ακόμη " + (10 - updatedUser.password.wrongPassword) + ((10 - updatedUser.password.wrongPassword) == 1 ? " προσπάθεια " : " προσπάθειες") + " πρωτού ο λογαριασμός σας κλειδωθεί για 24 ώρες" }] });
      }

      return res.status(400).json({ errors: [{ msg: "Ο κωδικός πρόσβασης δεν είναι σωστός" }] });
    }

    if (user.login.loginTokens.length > 0) {
      user.login.loginTokens = user.login.loginTokens.filter((token) => {
        try {
          jwt.verify(token, process.env.JWT_LOGIN_SECRET);
          return true; 
        } catch (err) {
          return false; 
        }
      });

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { loginTokens: user.login.loginTokens } }
      );
    }

    const token = jwt.sign({ userId: user._id, username: user.auth.username }, process.env.JWT_LOGIN_SECRET, { expiresIn: '6h' });
    
    const lastLogin = user.login.lastLogin;
    await db.collection('users').updateOne(
      { _id: new ObjectId(user._id) },
      {
        $set: {
          'login.lastLogin': Date.now(),
          'password.wrongPassword': 0,
          'login.loginTokens': [...user.login.loginTokens, token] 
        },
        $inc: { timesLoggedIn: 1 }
      }
    );

    res.json({ token: token, msg: "Session created", user: { id: user._id, username: user.auth.username, email: user.auth.email, lastLogin: lastLogin } });
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res.status(500).json({ errors: [{ msg: "DATABASE ERROR: Could not access document" }] });
  }
};

const logoutUser = async (req, res) => {
  const db = req.app.locals.db;
  const { id, username, token } = req.body || {};

  try {
    if (!token) {
      return res.status(400).json({ errors: [{ msg: "Token is missing" }] });
    }

    if (!id) {
      return res.status(400).json({ errors: [{ msg: "Id is missing" }] });
    }

    const user = await db.collection('users').findOne({ _id: new ObjectId(id) });

    if (!user) {
      if (!username) {
        return res.status(400).json({ errors: [{ msg: "Username is missing" }] });
      }
      user = await db.collection('users').findOne({ 'auth.username': username });
      if (!user) {
        return res.status(404).json({ errors: [{ msg: "User not found" }] });
      }
      else{
        if (!user.ids.oldIds || !user.ids.oldIds.includes(new ObjectId(id))) {
          return res.status(404).json({ errors: [{ msg: "User not found" }] });
        }
      }
    }

    if (!user.login.loginTokens || !user.login.loginTokens.includes(token)) {
      return res.status(400).json({ errors: [{ msg: "Token not found" }] });
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      { $pull: { 'login.loginTokens': token } }
    );

    res.status(200).json({ msg: "Successfully logged out" });

  } catch (err) {
    console.error("DATABASE ERROR:", err);
    res.status(500).json({ errors: [{ msg: "DATABASE ERROR: Could not update document" }] });
  }
};

const createUser = async (req, res) => {
  const db = req.app.locals.db;
  const user = req.body;
  const errors = req.validationErrors || [];

  const now = Date.now();
  user.created = now;
  
  try {
    if (!user.recaptchaToken) {
      return res.status(400).json({ errors: [{ msg: "Αποτυχία reCAPTCHA" }] });
    }

    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${process.env.RECAPTCHA_SECRET}&response=${user.recaptchaToken}`,
      }
    );

    const recaptchaResponse = await response.json();

    if (!recaptchaResponse.success) {
      return res.status(400).json({ errors: [{ msg: "Αποτυχία reCAPTCHA" }] });
    }

    if (await db.collection('users').findOne({ 'auth.username': user.username })) {
      errors.push({
        msg: "Το όνομα χρήστη " + user.username + " χρησιμοποιείται ήδη",
      });
    }

    if (await db.collection('users').findOne({ 'auth.email': user.email })) {
      errors.push({ msg: "Το email " + user.email + " χρησιμοποιείται ήδη" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);

    const updateQuery = buildUpdateQuery(unverifiedFields);
    const result = await db.collection('users').insertOne(updateQuery);

    await db.collection('users').updateOne(
      { _id: result.insertedId },
      {
        $set: {
          'auth.password': hashedPassword,
          'auth.email': user.email,
          'auth.username': user.username
        },
        $inc: { timesLoggedIn: 1 }
      }
    );
    
    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_VERIFICATION_SECRET, { expiresIn: '7d' });

    try {
      await sendVerificationEmail(user.email, user.username, token); 
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
    }

    res.status(201).json(result);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not create document" }] });
  }
};

const updateUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword, ...updates } = req.body;
  const id = req.params.id;

  if (Object.keys(updates).length === 0) {
    return res
      .status(400)
      .json({ errors: [{ msg: "ERROR: No update fields provided" }] });
  }

  if (!currentPassword) {
    return res
      .status(400)
      .json({ errors: [{ msg: "ERROR: Current password must be provided" }] });
  }

  try {
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res
        .status(404)
        .json({ errors: [{ msg: "ERROR: No user found with such id" }] });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.auth.password);
    if (!passwordMatch) {
      return res
        .status(403)
        .json({ errors: [{ msg: "ERROR: Current password is incorrect" }] });
    }

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const result = await db
      .collection("users")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });

    res.status(200).json(result);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not update document" }] });
  }
};

const deleteUser = async (req, res) => {
  const db = req.app.locals.db;
  const { currentPassword } = req.body;
  const id = req.params.id;

  if (!currentPassword) {
    return res
      .status(400)
      .json({ errors: [{ msg: "ERROR: Current password must be provided" }] });
  }

  try {
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res
        .status(404)
        .json({ errors: [{ msg: "ERROR: No user found with such id" }] });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.auth.password);
    if (!passwordMatch) {
      return res
        .status(403)
        .json({ errors: [{ msg: "ERROR: Current password is incorrect" }] });
    }

    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(id) });

    res.status(200).json(result);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "ERROR: Could not delete document" }] });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  loginUser,
  logoutUser,
  updateUser,
  deleteUser,
};
