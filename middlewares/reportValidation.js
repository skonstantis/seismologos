const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validateLatLon = (value, { req, location, path }) => {
  const numValue = Number(value);
  if (isNaN(numValue)) {
    throw new Error(`ERROR: ${path == "lat" ? "Latitude" : "Longitude"} must be a valid number`);
  }
  if (path === 'lat' && (numValue < -90 || numValue > 90)) {
    throw new Error('ERROR: Latitude must be between -90 and 90');
  }
  if (path === 'lon' && (numValue < -180 || numValue > 180)) {
    throw new Error('ERROR: Longitude must be between -180 and 180');
  }
  return true;
};

const validateReport = [
  body('intensity').isInt({ min: 1, max: 12 }).withMessage('ERROR: Intensity must be a number between 1 and 12'),
  body('response').isString().isLength({ max: 10000 }).withMessage('ERROR: Response must be a string with a maximum length of 10000 characters'),
  body('lat').custom(validateLatLon),
  body('lon').custom(validateLatLon)
];

const validateReportUpdate = [
  body('intensity').optional().isInt({ min: 1, max: 12 }).withMessage('ERROR: Intensity must be a number between 1 and 12'),
  body('response').optional().isString().isLength({ max: 10000 }).withMessage('ERROR: Response must be a string with a maximum length of 10000 characters'),
  body('lat').optional().custom(validateLatLon),
  body('lon').optional().custom(validateLatLon)
];

const validateReportIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('ERROR: Invalid parameter: id')
];

module.exports = { validateReport, validateReportUpdate, validateReportIdParam };