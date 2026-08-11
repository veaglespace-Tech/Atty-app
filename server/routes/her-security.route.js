const express = require("express");
const router = express.Router();
const { sendSosAlert, stopSosAlert } = require("../controllers/her-security.controller");
<<<<<<< HEAD
const { verifyToken } = require("../middlewares/token.middleware");

router.use(verifyToken);
=======
const { userProtected } = require("../middlewares/auth.middleware");

router.use(userProtected);
>>>>>>> a01164d8eae9ad547aa5f4852667e6e0c5bc20f1

router.post("/sos-alert", sendSosAlert);
router.post("/stop-sos-alert", stopSosAlert);

module.exports = router;
