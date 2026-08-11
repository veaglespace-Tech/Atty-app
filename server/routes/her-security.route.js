const express = require("express");
const router = express.Router();
const { sendSosAlert, stopSosAlert } = require("../controllers/her-security.controller");
const { verifyToken } = require("../middlewares/token.middleware");

router.use(verifyToken);

router.post("/sos-alert", sendSosAlert);
router.post("/stop-sos-alert", stopSosAlert);

module.exports = router;
