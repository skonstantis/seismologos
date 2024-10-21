const { body } = require('express-validator');

const validateMessage = [
  body('token').isString().isLength({ min: 1 }).withMessage('ERROR: Token invalid'),
  body('id').isString().isLength({ min: 1 }).withMessage('ERROR: Id invalid'),
  body('username').isString().isLength({ min: 1 }).withMessage('ERROR: Username invalid'),
  body('message').isString({ min: 1, max: 100 }).withMessage('ERROR: Message must be a number between 1 and 12'),
];

module.exports = { validateMessage };