const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");
const fetch = require("node-fetch");
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require("./emailController");

const getUsers = async (req, res) => {
  const db = req.app.locals.db;
  const page = parseInt(req.query.p) || 0;
  const elementsPerPage = 10;

  try {
    const elements = await db
      .collection("users")
      .find({}, { projection: { password: 0 } })
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
      .findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });
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

const loginUser =  async (req, res) => {
  const db = req.app.locals.db;
  const { key, password } = req.body || {};
  const errors = req.validationErrors || [];

  try{
    if (!key) {
      errors.push({
        msg: "Key (username or email) is required",
      });
    }

    if (!password) {
      errors.push({
        msg: "Password is required",
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const user = await db.collection("users").findOne({
      $or: [{ username: key }, { email: key }]
    });

    if (!user) {
      if(key.includes("@"))
        return res.status(400).json({ errors: [{ msg: "Δεν υπάρχει χρήστης με αυτό το e-mail" }] });
      else
        return res.status(400).json({ errors: [{ msg: "Δεν υπάρχει χρήστης με αυτό το username" }] });
    }

    if(user.verified == null)
      return res.status(400).json({ errors: [{ msg: "Επιβεβαιώστε τη διεύθυνση email για να ενεργοποιηθεί ο λογαριασμός σας" }] });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(user.userId) },
        {
          $inc: {
            wrongPassword: 1
          }
        }
      );

      if(user.wrongPassword >= 10)
      {
        await db.collection('users').updateOne(
          { _id: new ObjectId(user.userId) },
          {
            $set: {
              lockedUntil: Date.now() + 1000 * 60 * 60 * 24,
              wrongPassword: 0
            }
          }
        );
        return res.status(400).json({ errors: [{ msg: "Ο λογαριασμός σας έχει κλειδωθεί για 24 ώρες" }] });
      }

      if(user.wrongPassword >= 5)
      {
        return res.status(400).json({ errors: [{ msg: "Ο κωδικός πρόσβασης δεν είναι σωστός. Έχετε ακόμη" + 10 - user.wrongPassword + "προσπάθειες πρωτού ο λογαριασμός σας κλειδωθεί για 24 ώρες" }] });
      }

      return res.status(400).json({ errors: [{ msg: "Ο κωδικός πρόσβασης δεν είναι σωστός" }] });
    }
    
    await db.collection('users').updateOne(
      { _id: new ObjectId(user.userId) },
      {
        $set: {
          lastLogin: Date.now(),
          wrongPassword: 0
        },
        $inc: {
          timesLoggedIn: 1
        }
      }
    );

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  }
  catch(err)
  {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not access document" }] });
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

    if (await db.collection("users").findOne({ username: user.username })) {
      errors.push({
        msg: "Το όνομα χρήστη " + user.username + " χρησιμοποιείται ήδη",
      });
    }

    if (await db.collection("users").findOne({ email: user.email })) {
      errors.push({ msg: "Το email " + user.email + " χρησιμοποιείται ήδη" });
    }

    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;

    delete user.recaptchaToken;

    user.verified = null;
    user.threeDaysVerificationNotification = false;
    user.oneDayVerificationNotification = false;

    const result = await db.collection("users").insertOne(user);

    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '7d' });

    await sendVerificationEmail(
      user.email,
      user.username,
      token
    );

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

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
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

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
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
  updateUser,
  deleteUser,
};
