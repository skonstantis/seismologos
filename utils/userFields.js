const { ObjectId } = require('mongodb');

const verifiedFields = {
  $set: {
    verified: Date.now(),
    activity:
    {
        active: null,
    },
    password:{
        wrongPassword: 0,
    },
    login: {
      lastLogin: null,
      timesLoggedIn: 0,
      loginTokens: []
    },
    account: {
      lockedUntil: null,
    },
    ids: {
        oldIds: []
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
      threeDaysVerificationNotification: false,
      oneDayVerificationNotification: false,
    },
    auth: {
      username: null,
      email: null,
      password: null,
    },
  }
};

const buildUpdateQuery = (fields) => {
  const query = { $set: {}, $unset: {} };

  if (fields.$set) {
    for (const key in fields.$set) {
      if (typeof fields.$set[key] === 'object' && !Array.isArray(fields.$set[key])) {
        for (const subKey in fields.$set[key]) {
          query.$set[`${key}.${subKey}`] = fields.$set[key][subKey];
        }
      } else {
        query.$set[key] = fields.$set[key];
      }
    }
  }

  if (fields.$unset) {
    for (const key in fields.$unset) {
      query.$unset[key] = fields.$unset[key];
    }
  }

  return query;
};

module.exports = {
  verifiedFields,
  unverifiedFields,
  buildUpdateQuery,
};