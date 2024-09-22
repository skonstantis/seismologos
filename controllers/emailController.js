const nodemailer = require("nodemailer");
const { logger } = require("../config/logger");

const sendVerificationEmail = async (email, username, token) => {
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
        <a href="http://${process.env.HOST}/validate/verify-email?token=${token}" style="display: inline-block; padding: 10px 20px; margin: 10px 0; font-size: 16px; color: #fff; background-color: #4CAF50; text-align: center; text-decoration: none; border-radius: 5px;">Επιβεβαίωση e-mail</a>
        <p>Αν δεν κάνατε εσείς την εγγραφή, αγνοήστε το παρόν e-mail.</p>
        <p><strong>Σημαντικό:</strong> Έχετε <strong>7 ημέρες</strong> για να επιβεβαιώσετε το e-mail σας. Μετά από 7 ημέρες, ο λογαριασμός σας θα διαγραφεί αυτόματα, και θα πρέπει να δημιουργήσετε νέο.</p>
        <p>Με εκτίμηση,<br>Η ομάδα του seismologos.gr</p>
        <hr style="border: none; border-top: 1px solid #dcdcdc; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center">Αυτό το μήνυμα στάλθηκε αυτόματα από το seismologos.gr.<br>Παρακαλούμε μην απαντήσετε σε αυτό το e-mail.<br>Για οποιαδήποτε πληροφορία επικοινωνήστε μαζί μας στο support@seismologos.gr</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error("EMAIL ERROR:", error);
  }
};

const sendReminderEmail = async (email, username, daysLeft, token) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const dayText = daysLeft === 1 ? "ημέρα" : "ημέρες";

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: `Υπενθύμιση: ${daysLeft} ${dayText} για την επιβεβαίωση του e-mail σας`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dcdcdc; border-radius: 10px;">
        <h2 style="color: #333;">Αγαπητέ/ή ${username},</h2>
        <p>Σας υπενθυμίζουμε ότι έχετε ${daysLeft} ${dayText} για να επιβεβαιώσετε το e-mail σας στο seismologos.gr.</p>
        <p>Παρακαλούμε επιβεβαιώστε το e-mail σας για να μπορέσετε να χρησιμοποιήσετε όλες τις δυνατότητες της πλατφόρμας μας.</p>
        <a href="http://${process.env.HOST}/validate/verify-email?token=${token}" style="display: inline-block; padding: 10px 20px; margin: 10px 0; font-size: 16px; color: #fff; background-color: #4CAF50; text-align: center; text-decoration: none; border-radius: 5px;">Επιβεβαίωση e-mail</a>
        <p>Αν δεν κάνατε εσείς την εγγραφή, αγνοήστε το παρόν e-mail.</p>
        <p>Με εκτίμηση,<br>Η ομάδα του seismologos.gr</p>
        <hr style="border: none; border-top: 1px solid #dcdcdc; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center">Αυτό το μήνυμα στάλθηκε αυτόματα από το seismologos.gr.<br>Παρακαλούμε μην απαντήσετε σε αυτό το e-mail.<br>Για οποιαδήποτε πληροφορία επικοινωνήστε μαζί μας στο support@seismologos.gr</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error("EMAIL ERROR:", error);
  }
};

const sendDeletionEmail = async (email, username) => {
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
    subject: "Ο λογαριασμός σας στο seismologos.gr διαγράφηκε",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #dcdcdc; border-radius: 10px;">
        <h2 style="color: #333;">Αγαπητέ/ή ${username},</h2>
        <p>Δυστυχώς, επειδή δεν επιβεβαιώσατε το e-mail σας εντός της προβλεπόμενης χρονικής περιόδου, ο λογαριασμός σας στο seismologos.gr έχει διαγραφεί.</p>
        <p>Δεν έχουμε κρατήσει κανένα προσωπικό σας στοιχείο.</p>
        <p>Αν επιθυμείτε να χρησιμοποιήσετε ξανά τις υπηρεσίες μας με την ίδια διεύθυνση e-mail, παρακαλούμε δημιουργήστε νέο λογαριασμό.</p>
        <p>Με εκτίμηση,<br>Η ομάδα του seismologos.gr</p>
        <hr style="border: none; border-top: 1px solid #dcdcdc; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center">Αυτό το μήνυμα στάλθηκε αυτόματα από το seismologos.gr.<br>Παρακαλούμε μην απαντήσετε σε αυτό το e-mail.<br>Για οποιαδήποτε πληροφορία επικοινωνήστε μαζί μας στο support@seismologos.gr</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    logger.error("EMAIL ERROR:", error);
  }
};

module.exports = {
  sendVerificationEmail,
  sendReminderEmail,
  sendDeletionEmail,
};