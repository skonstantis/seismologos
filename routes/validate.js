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

module.exports = router;