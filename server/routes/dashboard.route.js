const express = require("express");
const router = express.Router();
const { getStats, getActivities } = require("../controllers/dashboard.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.use(verifyToken);
router.use(allowRoles("ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER", "MEMBER"));
router.use(checkActiveSubscription);

router.get("/stats", getStats);
router.get("/activities", getActivities);

module.exports = router;