const express = require("express");
const reportsRoutes = require("./reports");
const path = require("path");

const router = express.Router();

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/index.html"));
  });

router.use("/reports", reportsRoutes);

module.exports = router;
