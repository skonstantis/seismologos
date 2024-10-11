const { sendReminderEmail, sendDeletionEmail } = require("./emailController");
const jwt = require('jsonwebtoken');

const handleUnverifiedUsers = async (db) => {
  const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7 days
  const currentTime = Date.now();

  const threeDaysLeft = await db.collection('users').find({
    verified: null,
    'unverified.notifications.days.three': false,
    created: {
      $gte: currentTime - expirationTime,
      $lt: currentTime - (expirationTime - (3 * 24 * 60 * 60 * 1000)), // 3 days
    },
  }).toArray();

  for (const user of threeDaysLeft) {
    const token = jwt.sign({ userId: user.insertedId }, process.env.JWT_VERIFICATION_SECRET, { expiresIn: '3d' });

    try {
      await sendReminderEmail(user.email, user.username, 3, token); 
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { 'unverified.notifications.days.three': true } }
    );
  }

  const oneDayLeft = await db.collection('users').find({
    verified: null,
    'unverified.notifications.days.one': false,
    created: {
      $gte: currentTime - expirationTime,
      $lt: currentTime - (expirationTime - (1 * 24 * 60 * 60 * 1000)), // 1 day
    },
  }).toArray();

  for (const user of oneDayLeft) {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_VERIFICATION_SECRET, { expiresIn: '1d' });

    try {
      await sendReminderEmail(user.email, user.username, 1, token); 
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
    }

    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { 'unverified.notifications.days.one': true } }
    );
  }

  const unverifiedUsers = await db.collection('users').find({
    verified: null,
    created: { $lt: currentTime - expirationTime },
  }).toArray();

  for (const user of unverifiedUsers) {
    try {
      await sendDeletionEmail(user.auth.email, user.auth.username); 
    } catch (emailError) {
      logger.error('EMAIL ERROR:', emailError);
      return res.status(500).json({ msg: 'EMAIL ERROR: Could not send reset email' });
    }
  }

  const result = await db.collection('users').deleteMany({
    verified: null,
    created: { $lt: currentTime - expirationTime },
  });
};

module.exports = {
  handleUnverifiedUsers,
};
