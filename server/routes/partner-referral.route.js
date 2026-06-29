const express = require("express");
const router = express.Router();
const { createReferralPartner, getAllReferralPartners, getReferralPartnerById, deleteReferralPartner, getPublicPartnerStats } = require("../controllers/partner-referral.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Public route for partners to view their stats
router.post("/stats-public", getPublicPartnerStats);

// Super Admin routes for Referral Partners
router.post("/", userProtected, allowRoles("SUPER_ADMIN"), createReferralPartner);
router.get("/", userProtected, allowRoles("SUPER_ADMIN"), getAllReferralPartners);
router.get("/:id", userProtected, allowRoles("SUPER_ADMIN"), getReferralPartnerById);
router.delete("/:id", userProtected, allowRoles("SUPER_ADMIN"), deleteReferralPartner);

module.exports = router;
