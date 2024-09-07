const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validateReport = [
  body('intensity').isInt({ min: 1, max: 12 }).withMessage('Intensity must be a number between 1 and 12'),
  body('response').isString().isLength({ max: 10000 }).withMessage('Response must be a string with a maximum length of 10000 characters')
];

const validateUpdate = [
  body('intensity').optional().isInt({ min: 1, max: 12 }).withMessage('Intensity must be a number between 1 and 12'),
  body('response').optional().isString().isLength({ max: 10000 }).withMessage('Response must be a string with a maximum length of 10000 characters')
];

const validateIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('Invalid parameter: id')
];

module.exports = { validateReport, validateUpdate, validateIdParam };