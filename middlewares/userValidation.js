const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validatePassword = (value) => {
  const errors = [];

  if (!/[a-z]/.test(value)) {
    errors.push('Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα μικρό γράμμα');
  }
  if (!/[A-Z]/.test(value)) {
    errors.push('Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα κεφαλαίο γράμμα');
  }
  if (!/[0-9]/.test(value)) {
    errors.push('Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον έναν αριθμό');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors.push('Ο κωδικός πρόσβασης πρέπει να περιέχει τουλάχιστον ένα σύμβολο');
  }

  return errors;
};

const validateUser = [
  body('username').isString().isLength({ min: 4 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται τουλάχιστον από 4 χαρακτήρες'),
  body('username').isString().isLength({ max: 20 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται το πολύ από 20 χαρακτήρες'),
  body('password')
    .isString()
    .isLength({ max: 100 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται από το πολύ 100 χαρακτήρες')
    .isLength({ min: 8 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται τουλάχιστον από 8 χαρακτήρες')
    .custom((value) => {
      const errors = validatePassword(value);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      return true;
    })
];

const validateUserUpdate = [
  body('username').isString().isLength({ min: 4 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται τουλάχιστον από 4 χαρακτήρες'),
  body('username').isString().isLength({ max: 20 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται το πολύ από 20 χαρακτήρες'),
  body('password')
    .isString()
    .isLength({ max: 100 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται από το πολύ 100 χαρακτήρες')
    .isLength({ min: 8 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται τουλάχιστον από 8 χαρακτήρες')
    .custom((value) => {
      const errors = validatePassword(value);
      if (errors.length > 0) {
        throw new Error(errors.join(', '));
      }
      return true;
    })
];

const validateUserIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('ERROR: Invalid parameter: id')
];

module.exports = { validateUser, validateUserUpdate, validateUserIdParam };