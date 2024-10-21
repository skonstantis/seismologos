const express = require("express");
const reportsRoutes = require("./reports");
const usersRoutes = require("./users");
const validateRoutes = require("./validate");
const chatRoutes = require("./chat");
const path = require("path");

const router = express.Router();

router.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../pages/index.html"));
  });

router.use("/reports", reportsRoutes);

router.use("/users", usersRoutes);

router.use("/validate", validateRoutes);

router.use("/chat", chatRoutes);

module.exports = router;
