const express = require("express");
const router = express.Router();
const { optionalToken, verifyToken } = require("../middlewares/auth.middleware");
const { attyChat, attySupport } = require("../controllers/atty.controller");

// Chat works for guests too; support submission still needs auth.
router.post("/chat", optionalToken, attyChat);
router.post("/support", verifyToken, attySupport);

module.exports = router;
