const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const { attyChat, attySupport } = require("../controllers/atty.controller");

// Both routes require valid JWT
router.post("/chat", verifyToken, attyChat);
router.post("/support", verifyToken, attySupport);

module.exports = router;
