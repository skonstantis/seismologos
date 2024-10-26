const express = require("express");
const {
    validateMessage,
} = require("../middlewares/chatValidation");
  
const { handleValidationErrors } = require("../middlewares/errorHandler");
const chatController = require("../controllers/chatController");

const router = express.Router();

router.post(
  "/message",
  validateMessage,
  handleValidationErrors,
  chatController.createMessage,
);

router.get(
  "/last",
  chatController.getLastMessageId,
);

router.get(
  "/last",
  chatController.getLastMessageId,
);

router.get(
  "/message",
  chatController.getMessage,
);

router.get(
  "/messages",
  chatController.getMessagesBetween
);

module.exports = router;