const express = require("express");
const router = express.Router();
const { sendSosAlert } = require("../controllers/her-security.controller");
const { verifyToken } = require("../middlewares/token.middleware");

router.use(verifyToken);

router.post("/sos-alert", sendSosAlert);

module.exports = router;
