const express = require("express");
const router = express.Router();
const { onboardOrganization } = require("../controllers/org.controller");
const {
  getOrgUsers,
  getOrgUserById,
  createOrgUser,
  patchOrgUser,
  updateOrgUserStatus,
  toggleOrgUserActive,
  deleteOrgUser,
  getOrgNotifications,
} = require("../controllers/org-user.controller");
const {
  getOrgTeams,
  getOrgTeamById,
  getOrgTeamMembers,
  createOrgTeam,
  patchOrgTeam,
  deleteOrgTeam,
} = require("../controllers/org-team.controller");
const {
  getOrgAttendance,
  getOrgAttendanceSettings,
  updateOrgAttendanceSettings,
} = require("../controllers/org-attendance.controller");

const {
  getOrgDashboard,
  getOrgReports,
  downloadOrgReportsPdf,
  downloadOrgReportsExcel,
  getOrgSubscription,
} = require("../controllers/org-dashboard.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.post("/onboard", onboardOrganization);

router.use(
  userProtected,
  checkActiveSubscription,
  allowRoles("ORG_ADMIN", "SUB_ADMIN")
);

router.get("/dashboard", getOrgDashboard);
router.get("/reports", getOrgReports);
router.get("/reports/pdf", downloadOrgReportsPdf);
router.get("/reports/excel", downloadOrgReportsExcel);
router.get("/subscription", getOrgSubscription);

router.get("/notifications", getOrgNotifications);

router.get("/users", getOrgUsers);
router.get("/users/:userId", getOrgUserById);
router.post("/users", createOrgUser);
router.patch("/users/:userId", patchOrgUser);
router.patch("/users/:userId/status", updateOrgUserStatus);
router.patch("/users/:userId/active", toggleOrgUserActive);
router.delete("/users/:userId", deleteOrgUser);

router.get("/teams", getOrgTeams);
router.get("/teams/:teamId", getOrgTeamById);
router.get("/teams/:teamId/members", getOrgTeamMembers);
router.post("/teams", createOrgTeam);
router.patch("/teams/:teamId", patchOrgTeam);
router.delete("/teams/:teamId", deleteOrgTeam);

router.get("/attendance", getOrgAttendance);
router.get("/attendance/settings", getOrgAttendanceSettings);
router.patch("/attendance/settings", updateOrgAttendanceSettings);

module.exports = router;
