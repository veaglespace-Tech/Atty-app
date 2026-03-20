const express = require("express");
const router = express.Router();
const {
  getTeamLeaderDashboard,
  getTeamLeaderTeams,
  createTeamLeaderTeam,
  patchTeamLeaderTeam,
  deleteTeamLeaderTeam,
  getTeamLeaderAttendance,
  getTeamLeaderReports,
  getTeamLeaderUsers,
} = require("../controllers/team-leader.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.use(
  userProtected,
  checkActiveSubscription,
  allowRoles("TEAM_LEADER", "SUB_ADMIN", "ORG_ADMIN")
);

router.get("/dashboard", getTeamLeaderDashboard);
router.get("/teams", getTeamLeaderTeams);
router.post("/teams", createTeamLeaderTeam);
router.patch("/teams/:teamId", patchTeamLeaderTeam);
router.delete("/teams/:teamId", deleteTeamLeaderTeam);
router.get("/users", getTeamLeaderUsers);
router.get("/attendance", getTeamLeaderAttendance);
router.get("/reports", getTeamLeaderReports);

module.exports = router;

