const express = require("express");
const {
  validateReport,
  validateReportUpdate,
  validateReportIdParam,
} = require("../middlewares/reportValidation");
const { handleValidationErrors } = require("../middlewares/errorHandler");
const reportsController = require("../controllers/reportsController");

const router = express.Router();

router.get("/", reportsController.getReports);

router.get(
  "/:id",
  validateReportIdParam,
  handleValidationErrors,
  reportsController.getReportById
);

router.post(
  "/",
  validateReport,
  handleValidationErrors,
  reportsController.createReport
);

router.patch(
  "/:id",
  validateReportIdParam,
  validateReportUpdate,
  handleValidationErrors,
  reportsController.updateReport
);

router.delete(
  "/:id",
  validateReportIdParam,
  handleValidationErrors,
  reportsController.deleteReport
);

router.post(
  "/:id/revive",
  validateReportIdParam,
  handleValidationErrors,
  reportsController.reviveReport
);

module.exports = router;
