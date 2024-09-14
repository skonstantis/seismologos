const { validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.validationErrors = errors.array();
  } else {
    req.validationErrors = [];
  }
  next();
};

module.exports = { handleValidationErrors };
