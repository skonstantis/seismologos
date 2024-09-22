const deleteUnverifiedUsers = async (db) => {
  const expirationTime = 60 * 1000;
  const cutoffTime = Date.now() - expirationTime;

  const result = await db.collection("users").deleteMany({
    verifiedEmail: false,
    created: { $lt: cutoffTime },
  });

  console.log(`Deleted ${result.deletedCount} unverified users.`);
};

module.exports = {
  deleteUnverifiedUsers,
};
