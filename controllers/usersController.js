const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { logger } = require("../config/logger");
const fetch = require("node-fetch");
const jwt = require('jsonwebtoken');

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

    user.verifiedEmail = false;

    const result = await db.collection("users").insertOne(user);

    const token = jwt.sign({ userId: result.insertedId }, process.env.JWT_SECRET, { expiresIn: '1d' });

    await sendVerificationEmail(
      user.email,
      user.username,
      token,
      req.headers.host
    );

    res.status(201).json(result);
  } catch (err) {
    logger.error("DATABASE ERROR:", err);
    res
      .status(500)
      .json({ errors: [{ msg: "DATABASE ERROR: Could not create document" }] });
  }
};

const sendVerificationEmail = async (email, username, token, host) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Επιβεβαίωση e-mail seismologos.gr",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dcdcdc; border-radius: 10px;">
        <h2 style="color: #333;">Καλωσορίσατε, ${username}!</h2>
        <p>Ευχαριστούμε για την εγγραφή σας στο seismologos.gr.</p>
        <p>Για να επιβεβαιώσετε το e-mail σας, παρακαλούμε επιλέξτε 'Επιβεβαίωση e-mail' παρακάτω.</p>
        <a href="http://${host}/validate/verify-email?token=${token}" style="display: inline-block; padding: 10px 20px; margin: 10px 0; font-size: 16px; color: #fff; background-color: #4CAF50; text-align: center; text-decoration: none; border-radius: 5px;">Επιβεβαίωση e-mail</a>
        <p>Αν δεν κάνατε εσείς την εγγραφή, μπορείτε να αγνοήσετε αυτό το e-mail.</p>
        <p><strong>Σημαντικό:</strong> Έχετε <strong>7 ημέρες</strong> για να επιβεβαιώσετε το e-mail σας. Μετά από 7 ημέρες, ο λογαριασμός σας θα διαγραφεί αυτόματα, και θα πρέπει να δημιουργήσετε έναν νέο.</p>
        <p>Με εκτίμηση,<br>Η ομάδα του seismologos.gr</p>
        <hr style="border: none; border-top: 1px solid #dcdcdc; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center">Αυτό το μήνυμα στάλθηκε αυτόματα από το seismologos.gr.<br>Παρακαλούμε μην απαντήσετε σε αυτό το e-mail.<br>Για οποιαδήποτε πληροφορία επικοινωνήστε μαζί μας στο support@seismologos.gr</p>
      </div>
      <style>
        @media only screen and (max-width: 600px) {
          h2 {
            font-size: 20px;
          }
          p {
            font-size: 14px;
          }
          a {
            font-size: 15px;
            padding: 8px 16px;
          }
        }
      </style>
    `,
  };  

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error("EMAIL ERROR:", error);
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
  updateUser,
  deleteUser,
};
