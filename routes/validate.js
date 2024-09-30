const express = require("express");
const {
  validateUser
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

router.post(
  "/change-password",
  validationController.changePassword
);

module.exports = router;