const express = require("express");
const reportsRoutes = require("./reports");

const router = express.Router();

router.use("/reports", reportsRoutes);

module.exports = router;
