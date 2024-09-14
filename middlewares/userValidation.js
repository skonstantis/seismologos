const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validateUser = [
  body('username').isString().isLength({ min: 4 }).withMessage('Το ονόμα χρήστη πρέπει να αποτελείται τουλάχιστον από 4 χαρακτήρες'),
  body('username').isString().isLength({ max: 20 }).withMessage('Το ονόμα χρήστη πρέπει να αποτελείται το πολύ από 20 χαρακτήρες'),
  body('password').isString().isLength({ max: 100 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται από το πολύ 100 χαρακτήρες'),
  body('password').isString().isLength({ min: 8 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται τουλάχιστον από 8 χαρακτήρες')
];

const validateUserUpdate = [
  body('username').isString().isLength({ min: 4 }).withMessage('Το ονόμα χρήστη πρέπει να αποτελείται τουλάχιστον από 4 χαρακτήρες'),
  body('username').isString().isLength({ max: 20 }).withMessage('Το ονόμα χρήστη πρέπει να αποτελείται το πολύ από 20 χαρακτήρες'),
  body('password').isString().isLength({ max: 100 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται από το πολύ 100 χαρακτήρες'),
  body('password').isString().isLength({ min: 8 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται τουλάχιστον από 8 χαρακτήρες')
];

const validateUserIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('ERROR: Invalid parameter: id')
];

module.exports = { validateUser, validateUserUpdate, validateUserIdParam };
