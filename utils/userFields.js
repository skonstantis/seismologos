const verifiedFields = {
  $set: {
    verified: Date.now(),
    activity:
    {
        active: null,
    },
    password:{
        wrong: 0,
    },
    login: {
      last: null,
      times: 0,
      tokens: []
    },
    account: {
      locked: null,
    },
    ids: {
        old: []
    },
  },
  $unset: {
    unverified: "",
  },
};

const unverifiedFields = {
  $set: {
    created: Date.now(),
    unverified: {
      notifications: {
        days: {
          three: false,
          one: false,
        },
      },
    },
    auth: {
      username: null,
      email: null,
      password: null,
    },
  }
};

module.exports = {
  verifiedFields,
  unverifiedFields,
};