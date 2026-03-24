const express = require("express");
const router = express.Router();
const { createOrder, verifyAndRegister, getPublicKey, archiveFailedRegistrationAttempt } = require("../controllers/payment.controller");

router.get("/get-key", getPublicKey);
router.post("/create-order", createOrder);
router.post("/verify-and-register", verifyAndRegister);
router.post("/archive-failed-registration", archiveFailedRegistrationAttempt);

module.exports = router;
