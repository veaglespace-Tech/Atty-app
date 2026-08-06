const express = require("express");
const router = express.Router();
const { sendSosAlert, stopSosAlert } = require("../controllers/her-security.controller");
const { userProtected } = require("../middlewares/auth.middleware");

router.use(userProtected);

router.post("/sos-alert", sendSosAlert);
router.post("/stop-sos-alert", stopSosAlert);

module.exports = router;
