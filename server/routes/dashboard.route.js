const express = require("express");
const router = express.Router();
const { getStats, getActivities } = require("../controllers/dashboard.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { requireMembership } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.use(verifyToken);
router.use(requireMembership());
router.use(checkActiveSubscription);

router.get("/stats", getStats);
router.get("/activities", getActivities);

module.exports = router;