const { body, param } = require('express-validator');
const { ObjectId } = require("mongodb");

const validatePassword = (value) => {
  const errors = [];
  if (!/[a-zα-ω]/.test(value)) {
    errors.push('τουλάχιστον ένα μικρό γράμμα (Αγγλικά ή Ελληνικά)');
  }
  if (!/[A-ZΑ-Ω]/.test(value)) {
    errors.push('τουλάχιστον ένα κεφαλαίο γράμμα (Αγγλικά ή Ελληνικά)');
  }
  if (!/[0-9]/.test(value)) {
    errors.push('τουλάχιστον έναν αριθμό');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
    errors.push('τουλάχιστον ένα σύμβολο');
  }
  return errors;
};

const usernameValidation = () => {
  return body('username')
    .isString()
    .isLength({ min: 4 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται τουλάχιστον από 4 χαρακτήρες')
    .isLength({ max: 50 }).withMessage('Το όνομα χρήστη πρέπει να αποτελείται το πολύ από 50 χαρακτήρες')
    .custom((value) => {
      if (!/^[a-zA-Z0-9α-ωΑ-Ω_-]+$/.test(value)) {
        throw new Error('Το όνομα χρήστη μπορεί να περιέχει μόνο γράμματα (Αγγλικά ή Ελληνικά), αριθμούς, κάτω παύλες και παύλες.');
      }
      return true;
    });
};

const passwordValidation = () => {
  return body('password')
    .isString()
    .isLength({ max: 100 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται από το πολύ 100 χαρακτήρες')
    .isLength({ min: 8 }).withMessage('Ο κωδικός πρόσβασης πρέπει να αποτελείται τουλάχιστον από 8 χαρακτήρες')
    .custom((value) => {
      if (!/^[a-zA-Z0-9α-ωΑ-Ω!@#$%^&*()-_=+{}[\]:;"'<>,.?/`~\\|]+$/.test(value)) {
        throw new Error('Ο κωδικός πρόσβασης μπορεί να περιέχει μόνο γράμματα (Αγγλικά ή Ελληνικά), αριθμούς και ειδικούς χαρακτήρες.');
      }
      return true;
    })
    .custom((value) => {
      const errors = validatePassword(value);
      if (errors.length > 0) {
        const lastError = errors.pop();
        const errorMessage = errors.length > 0 
          ? errors.join(', ') + ' και ' + lastError 
          : lastError;
        throw new Error("Ο κωδικός πρόσβασης πρέπει να περιέχει " + errorMessage);
      }
      return true;
    });;
};

const emailValidation = () => {
  return body('email').isEmail().withMessage('Παρακαλώ εισάγετε μια έγκυρη διεύθυνση email');
};

const validateUser = [
  usernameValidation(),
  passwordValidation(),
  emailValidation(),
];

const validateUserUpdate = [
  usernameValidation(),
  passwordValidation(),
  emailValidation(),
];

const validateUserPassword = [
  passwordValidation(),
];

const validateUserIdParam = [
  param('id').custom(value => ObjectId.isValid(value)).withMessage('ERROR: Invalid parameter: id')
];

module.exports = { validateUser, validateUserUpdate, validateUserPassword, validateUserIdParam };