const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validateReport = [
  body('intensity').isInt({ min: 1, max: 12 }).withMessage('Intensity must be a number between 1 and 12'),
  body('response').isString().isLength({ max: 10000 }).withMessage('Response must be a string with a maximum length of 10000 characters'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in the format yyyy-mm-dd').bail().custom(value => !isNaN(new Date(value).getTime())).withMessage('Date must be a valid date'),
  body('time').matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('Time must be in the format hh:mm:ss')
];

const validateUpdate = [
  body('intensity').optional().isInt({ min: 1, max: 12 }).withMessage('Intensity must be a number between 1 and 12'),
  body('response').optional().isString().isLength({ max: 10000 }).withMessage('Response must be a string with a maximum length of 10000 characters'),
  body('date').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date must be in the format yyyy-mm-dd').bail().custom(value => !isNaN(new Date(value).getTime())).withMessage('Date must be a valid date'),
  body('time').optional().matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/).withMessage('Time must be in the format hh:mm:ss')
];

const validateIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('Invalid parameter: id')
];

module.exports = { validateReport, validateUpdate, validateIdParam };
