const express = require("express");
const router = express.Router();
const {
  getTeamLeaderDashboard,
  getTeamLeaderTeams,
  getTeamLeaderTeamById,
  createTeamLeaderTeam,
  patchTeamLeaderTeam,
  deleteTeamLeaderTeam,
  getTeamLeaderAttendance,
  getTeamLeaderReports,
  getTeamLeaderUsers,
  downloadTeamLeaderReportsPdf,
  downloadTeamLeaderReportsExcel,
} = require("../controllers/team-leader.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");
const { enforceAbac } = require("../middlewares/abac.middleware");

router.use(
  userProtected,
  checkActiveSubscription,
  allowRoles("TEAM_LEADER", "SUB_ADMIN", "ORG_ADMIN", "MEMBER")
);

router.get("/dashboard", getTeamLeaderDashboard);
router.get("/teams", getTeamLeaderTeams);
router.get("/teams/:teamId", enforceAbac("team"), getTeamLeaderTeamById);
router.post("/teams", createTeamLeaderTeam);
router.patch("/teams/:teamId", enforceAbac("team"), patchTeamLeaderTeam);
router.delete("/teams/:teamId", enforceAbac("team"), deleteTeamLeaderTeam);
router.get("/users", getTeamLeaderUsers);
router.get("/attendance", enforceAbac("team"), getTeamLeaderAttendance);
router.get("/reports", enforceAbac("team"), getTeamLeaderReports);
router.get("/reports/pdf", downloadTeamLeaderReportsPdf);
router.get("/reports/excel", downloadTeamLeaderReportsExcel);

module.exports = router;

