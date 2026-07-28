const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth.middleware");
const { sosAlert, stopSosAlert } = require("../controllers/her-security.controller");

router.post("/sos-alert", verifyToken, sosAlert);
router.post("/stop-sos-alert", verifyToken, stopSosAlert);

module.exports = router;
