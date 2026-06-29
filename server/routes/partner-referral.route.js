const express = require("express");
const router = express.Router();
const { toggleReferralPartner, getPartnerStats } = require("../controllers/partner-referral.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Super Admin route to toggle partner status
router.post("/toggle-partner/:userId", userProtected, allowRoles("SUPER_ADMIN"), toggleReferralPartner);

// Partner route to get their own stats
router.get("/stats", userProtected, getPartnerStats);

module.exports = router;
