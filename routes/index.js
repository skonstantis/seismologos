const express = require("express");
const reportsRoutes = require("./reports");
const usersRoutes = require("./users");
const path = require("path");

const router = express.Router();

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/index.html"));
  });

router.use("/reports", reportsRoutes);

router.use("/users", usersRoutes);

module.exports = router;
