const express = require("express");
const router = express.Router();
const { createReferralPartner, getAllReferralPartners, getReferralPartnerById, deleteReferralPartner, getPublicPartnerStats, updateReferralPartner } = require("../controllers/partner-referral.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { requireSuperAdmin } = require("../middlewares/rbac.middleware");

// Public route for partners to view their stats
router.post("/stats-public", getPublicPartnerStats);

// Super Admin routes for Referral Partners
router.post("/", userProtected, requireSuperAdmin(), createReferralPartner);
router.get("/", userProtected, requireSuperAdmin(), getAllReferralPartners);
router.get("/:id", userProtected, requireSuperAdmin(), getReferralPartnerById);
router.put("/:id", userProtected, requireSuperAdmin(), updateReferralPartner);
router.delete("/:id", userProtected, requireSuperAdmin(), deleteReferralPartner);

module.exports = router;
