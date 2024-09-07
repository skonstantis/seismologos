const express = require("express");
const { validateReport, validateUpdate, validateIdParam } = require("../middlewares/validation");
const { handleValidationErrors } = require("../middlewares/errorHandler");
const reportsController = require("../controllers/reportsController");

const router = express.Router();

router.get("/", reportsController.getReports);
router.get("/:id", validateIdParam, handleValidationErrors, reportsController.getReportById);
router.post("/", validateReport, handleValidationErrors, reportsController.createReport);
router.patch("/:id", validateIdParam, validateUpdate, handleValidationErrors, reportsController.updateReport);
router.delete("/:id", validateIdParam, handleValidationErrors, reportsController.deleteReport);
router.post("/:id/revive", validateIdParam, handleValidationErrors, reportsController.reviveReport); 

module.exports = router;