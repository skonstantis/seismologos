const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validateUser = [
  body('username').isString().isLength({ max: 20 }).withMessage('Username must be a string with a maximum length of 20 characters'),
  body('password').isString().isLength({ max: 20 }).withMessage('Password must be a string with a maximum length of 20 characters')
];

const validateUserUpdate = [
    body('username').optional().isString().isLength({ max: 20 }).withMessage('Username must be a string with a maximum length of 20 characters'),
    body('password').optional().isString().isLength({ max: 20 }).withMessage('Password must be a string with a maximum length of 20 characters')
  ];

const validateUserIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('Invalid parameter: id')
];

module.exports = { validateUser, validateUserUpdate, validateUserIdParam };