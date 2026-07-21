const express = require("express");
const router = express.Router();
const {
  createOrder,
  createRenewalOrder,
  verifyAndRegister,
  verifyRenewal,
  getPublicKey,
  getGstRateEndpoint,
  archiveFailedRegistrationAttempt,
  payuSuccess,
  payuFailure,
  payuRenewalSuccess,
  payuRenewalFailure,
} = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { requirePermission } = require("../middlewares/rbac.middleware");
const { PERMISSIONS } = require("../constants/permissions");

router.get("/get-key", getPublicKey);
router.get("/gst", getGstRateEndpoint);
router.post("/create-order", createOrder);
router.post("/create-renewal-order", verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), createRenewalOrder);
router.post("/verify-and-register", verifyAndRegister);
router.post("/verify-renewal", verifyToken, requirePermission(PERMISSIONS.SUBSCRIPTION.MANAGE), verifyRenewal);
router.post("/archive-failed-registration", archiveFailedRegistrationAttempt);
// PayU Callbacks (POST from PayU servers)
router.post("/payu-success", payuSuccess);
router.post("/payu-failure", payuFailure);
router.post("/payu-renewal-success", payuRenewalSuccess);
router.post("/payu-renewal-failure", payuRenewalFailure);

module.exports = router;
