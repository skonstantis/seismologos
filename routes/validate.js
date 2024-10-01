const express = require("express");
const {
  validateUser, validateUserPassword, validateUserEmail
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

router.post(
  "/change-password-validated",
  validateUserPassword,
  handleValidationErrors,
  validationController.changePasswordValidated
);

router.post(
  "/forgot-password",
  validateUserEmail,
  handleValidationErrors,
  validationController.forgotPassword
);

module.exports = router;