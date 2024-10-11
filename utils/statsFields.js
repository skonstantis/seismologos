const statsFields = {
  $set: {
    active: {
      users: 0,
      visitors: 0,
    },
  },
};

module.exports = {
    statsFields
};
