const { sendReminderEmail, sendDeletionEmail } = require("./emailController");

const handleUnverifiedUsers = async (db) => {
  const threeMinutes = 3 * 60 * 1000; // 3 minutes for testing
  const oneMinute = 1 * 60 * 1000;     // 1 minute for testing
  const expirationTime = 7 * 60 * 1000; // 7 minutes in milliseconds
  const currentTime = Date.now();

  const threeMinutesLeft = await db.collection("users").find({
    verifiedEmail: false,
    created: { $gte: currentTime - expirationTime, $lt: currentTime - (expirationTime - threeMinutes) },
  }).toArray();

  for (const user of threeMinutesLeft) {
    await sendReminderEmail(user.email, user.username, 3);
  }

  const oneMinuteLeft = await db.collection("users").find({
    verifiedEmail: false,
    created: { $gte: currentTime - expirationTime, $lt: currentTime - (expirationTime - oneMinute) },
  }).toArray();

  for (const user of oneMinuteLeft) {
    await sendReminderEmail(user.email, user.username, 1);
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

  if (result.deletedCount > 0) {
    console.log(`Deleted ${result.deletedCount} unverified users.`);
  }
};

module.exports = {
  handleUnverifiedUsers,
};
