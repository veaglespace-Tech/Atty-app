const express = require("express");
const router = express.Router();
const {
  createOrder,
  createRenewalOrder,
  verifyAndRegister,
  verifyRenewal,
  getPublicKey,
  archiveFailedRegistrationAttempt,
} = require("../controllers/payment.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

router.get("/get-key", getPublicKey);
router.post("/create-order", createOrder);
router.post("/create-renewal-order", verifyToken, allowRoles("ORG_ADMIN"), createRenewalOrder);
router.post("/verify-and-register", verifyAndRegister);
router.post("/verify-renewal", verifyToken, allowRoles("ORG_ADMIN"), verifyRenewal);
router.post("/archive-failed-registration", archiveFailedRegistrationAttempt);

module.exports = router;
