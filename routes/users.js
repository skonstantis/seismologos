const express = require("express");
const {
  validateUser,
  validateUserUpdate,
  validateUserIdParam,
} = require("../middlewares/userValidation");
const { handleValidationErrors } = require("../middlewares/errorHandler");
const usersController = require("../controllers/usersController");

const router = express.Router();

router.get("/", usersController.getUsers);

router.get(
  "/:id",
  validateUserIdParam,
  handleValidationErrors,
  usersController.getUserById
);

router.post(
  "/",
  validateUser,
  handleValidationErrors,
  usersController.createUser
);

router.patch(
  "/:id",
  validateUserIdParam,
  validateUserUpdate,
  handleValidationErrors,
  usersController.updateUser
);

router.delete(
  "/:id",
  validateUserIdParam,
  handleValidationErrors,
  usersController.deleteUser
);

module.exports = router;
