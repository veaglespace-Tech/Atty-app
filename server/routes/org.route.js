const express = require("express");
const router = express.Router();
const { onboardOrganization } = require("../controllers/org.controller");
const {
  getOrgUsers,
  getOrgUserById,
  downloadOrgUserProfilePdf,
  createOrgUser,
  patchOrgUser,
  updateOrgUserStatus,
  toggleOrgUserActive,
  deleteOrgUser,
  getOrgNotifications,
  getOrgNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  downloadOrgUsersExcel,
  downloadOrgUsersPdf,
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
  getOrgAttendanceLogById,
  getOrgAttendanceSettings,
  updateOrgAttendanceSettings,
  getOrgUserAttendanceLogs,
  downloadOrgUserAttendancePdf,
  downloadOrgUserAttendanceExcel,
  downloadOrgAttendancePdf,
  downloadOrgAttendanceExcel,
  getOrgRegularizationRequests,
  approveRegularizationRequest,
  rejectRegularizationRequest,
} = require("../controllers/org-attendance.controller");
const {
  getOrgRegistrationRequests,
  acceptRegistrationRequest,
  rejectRegistrationRequest,
} = require("../controllers/registration-request.controller");

const {
  getOrgDashboard,
  getOrgReports,
  downloadOrgReportsPdf,
  downloadOrgReportsExcel,
  getOrgSubscription,
} = require("../controllers/org-dashboard.controller");
const { updateOrgLogo, updateOrgDetails } = require("../controllers/org-settings.controller");
const {
  getOrgInstruments,
  createOrgInstrument,
  patchOrgInstrument,
  deleteOrgInstrument,
  assignInstrumentToUsers,
  unassignInstrumentFromUser,
  updateInstrumentAssignment
} = require("../controllers/org-instrument.controller");
const {
  getOrgDepartments,
  createOrgDepartment,
  patchOrgDepartment,
  deleteOrgDepartment,
  assignDepartmentToUsers,
  unassignDepartmentFromUser,
} = require("../controllers/org-department.controller");

const { userProtected } = require("../middlewares/auth.middleware");
const { requireMembership, requirePermission } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");
const { PERMISSIONS } = require("../constants/permissions");

router.post("/onboard", onboardOrganization);

router.use(userProtected);

router.get(
  "/subscription",
  requireMembership(),
  getOrgSubscription
);

router.use(
  checkActiveSubscription,
  requireMembership()
);

router.patch("/settings/logo", requirePermission(PERMISSIONS.TEAM.UPDATE), updateOrgLogo);
router.patch("/settings/details", requirePermission(PERMISSIONS.TEAM.UPDATE), updateOrgDetails);

router.get("/dashboard", getOrgDashboard);
router.get("/reports", getOrgReports);
router.get("/reports/pdf", downloadOrgReportsPdf);
router.get("/reports/excel", downloadOrgReportsExcel);

router.get("/notifications", getOrgNotifications);
router.post("/notifications/read-all", markAllNotificationsAsRead);
router.get("/notifications/:id", getOrgNotificationById);
router.post("/notifications/:id/read", markNotificationAsRead);

router.get("/users", getOrgUsers);
router.get("/users/pdf", downloadOrgUsersPdf);
router.get("/users/excel", downloadOrgUsersExcel);
router.get("/users/:userId", getOrgUserById);
router.get("/users/:userId/profile-pdf", downloadOrgUserProfilePdf);
router.get("/users/:userId/attendance/logs", getOrgUserAttendanceLogs);
router.get("/users/:userId/attendance/pdf", downloadOrgUserAttendancePdf);
router.get("/users/:userId/attendance/excel", downloadOrgUserAttendanceExcel);
router.post("/users", createOrgUser);
router.patch("/users/:userId", patchOrgUser);
router.patch("/users/:userId/status", updateOrgUserStatus);
router.patch("/users/:userId/active", toggleOrgUserActive);
router.delete("/users/:userId", deleteOrgUser);

router.get("/registration-requests", requirePermission(PERMISSIONS.USERS.UPDATE_STATUS), getOrgRegistrationRequests);
router.patch("/registration-requests/:id/accept", requirePermission(PERMISSIONS.USERS.UPDATE_STATUS), acceptRegistrationRequest);
router.patch("/registration-requests/:id/reject", requirePermission(PERMISSIONS.USERS.UPDATE_STATUS), rejectRegistrationRequest);

router.get("/teams", getOrgTeams);
router.get("/teams/:teamId", getOrgTeamById);
router.get("/teams/:teamId/members", getOrgTeamMembers);
router.post("/teams", createOrgTeam);
router.patch("/teams/:teamId", patchOrgTeam);
router.delete("/teams/:teamId", deleteOrgTeam);

router.get("/attendance", getOrgAttendance);
router.get("/attendance/pdf", downloadOrgAttendancePdf);
router.get("/attendance/excel", downloadOrgAttendanceExcel);
router.get("/attendance/settings", getOrgAttendanceSettings);
router.patch("/attendance/settings", updateOrgAttendanceSettings);
router.get("/attendance/:id", getOrgAttendanceLogById);

router.get("/regularization-requests", getOrgRegularizationRequests);
router.patch("/regularization-requests/:id/approve", approveRegularizationRequest);
router.patch("/regularization-requests/:id/reject", rejectRegularizationRequest);

router.get("/instruments", getOrgInstruments);
router.post("/instruments", requirePermission(PERMISSIONS.USERS.CREATE), createOrgInstrument);
router.patch("/instruments/:id", requirePermission(PERMISSIONS.USERS.CREATE), patchOrgInstrument);
router.delete("/instruments/:id", requirePermission(PERMISSIONS.USERS.CREATE), deleteOrgInstrument);
router.post("/instruments/assign", requirePermission(PERMISSIONS.USERS.CREATE), assignInstrumentToUsers);
router.patch("/instruments/assign/:instrumentId/:userId", requirePermission(PERMISSIONS.USERS.CREATE), updateInstrumentAssignment);
router.delete("/instruments/assign/:instrumentId/:userId", requirePermission(PERMISSIONS.USERS.CREATE), unassignInstrumentFromUser);

router.get("/departments", getOrgDepartments);
router.post("/departments", requirePermission(PERMISSIONS.USERS.CREATE), createOrgDepartment);
router.patch("/departments/:id", requirePermission(PERMISSIONS.USERS.CREATE), patchOrgDepartment);
router.delete("/departments/:id", requirePermission(PERMISSIONS.USERS.CREATE), deleteOrgDepartment);
router.post("/departments/assign", requirePermission(PERMISSIONS.USERS.CREATE), assignDepartmentToUsers);
router.delete("/departments/assign/:departmentId/:userId", requirePermission(PERMISSIONS.USERS.CREATE), unassignDepartmentFromUser);

module.exports = router;
