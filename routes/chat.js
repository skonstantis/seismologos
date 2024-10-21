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

module.exports = router;