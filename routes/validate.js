const express = require("express");
const {
  validateUser, validateUserPassword
} = require("../middlewares/userValidation");
const { handleValidationErrors } = require("../middlewares/errorHandler");
const validationController = require("../controllers/validationController");

const router = express.Router();

router.post(
  "/user",
  validateUser,
  handleValidationErrors,
  validationController.validateUser
);

router.post(
  "/session",
  validationController.validateSession
);

router.get(
  "/verify-email",
  validationController.verifyEmail
);

router.get(
  "/change-password",
  validationController.changePassword
);

router.get(
  "/change-password-validated",
  validateUserPassword,
  validationController.changePasswordValidated
);

module.exports = router;