const { sendReminderEmail, sendDeletionEmail } = require("./emailController");

const handleUnverifiedUsers = async (db) => {
  const expirationTime = 7 * 24 * 60 * 60 * 1000; // 7 days
  const currentTime = Date.now();

  const threeDaysLeft = await db.collection("users").find({
    verifiedEmail: false,
    threeDaysVerificationNotification: false,
    created: {
      $gte: currentTime - expirationTime,
      $lt: currentTime - (expirationTime - (3 * 24 * 60 * 60 * 1000)), // 3 days
    },
  }).toArray();

  for (const user of threeDaysLeft) {
    await sendReminderEmail(user.email, user.username, 3);
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { threeDaysVerificationNotification: true } }
    );
  }

  const oneDayLeft = await db.collection("users").find({
    verifiedEmail: false,
    oneDayVerificationNotification: false,
    created: {
      $gte: currentTime - expirationTime,
      $lt: currentTime - (expirationTime - (1 * 24 * 60 * 60 * 1000)), // 1 day
    },
  }).toArray();

  for (const user of oneDayLeft) {
    await sendReminderEmail(user.email, user.username, 1);
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { oneDayVerificationNotification: true } }
    );
  }

  const unverifiedUsers = await db.collection("users").find({
    verifiedEmail: false,
    created: { $lt: currentTime - expirationTime },
  }).toArray();

  for (const user of unverifiedUsers) {
    await sendDeletionEmail(user.email, user.username);
  }

  const result = await db.collection("users").deleteMany({
    verifiedEmail: false,
    created: { $lt: currentTime - expirationTime },
  });
};

module.exports = {
  handleUnverifiedUsers,
};
