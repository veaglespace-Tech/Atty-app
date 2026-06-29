const express = require("express");
const router = express.Router();
const {
  getSuperAdminDashboard,
  getSuperAdminOrganizations,
  getSuperAdminOrganizationById,
  getSuperAdminOrganizationUsers,
  getSuperAdminOrganizationTeams,
  patchSuperAdminOrganization,
  createSuperAdminOrganization,
  extendSuperAdminOrganizationPlan,
  updateOrganizationAccess,
  getSuperAdminPlans,
  getSuperAdminPayments,
  getSuperAdminPaymentById,
  updateSuperAdminPayment,
  deleteSuperAdminPayment,
  getSuperAdminAnalytics,
  downloadSuperAdminOrganizationsPdf,
  downloadSuperAdminOrganizationsExcel,
  downloadSuperAdminDashboardPdf,
  downloadSuperAdminDashboardExcel,
  downloadSuperAdminPaymentsPdf,
  downloadSuperAdminPaymentsExcel,
  archiveOrganizationAction,
  restoreOrganizationAction,
  getSuperAdminUserById,
  patchSuperAdminUser,
  getAllSuperAdminUsers,
  getSystemSettings,
  updateSystemSetting,
  getSuperAdminPosts,
  createSuperAdminPost,
  updateSuperAdminPost,
  deleteSuperAdminPost,
  getSuperAdminAttendanceReports,
  downloadSuperAdminAttendanceReportsPdf,
  downloadSuperAdminAttendanceReportsExcel,
  getSuperAdminUserAttendanceLogs,
  downloadSuperAdminUserAttendancePdf,
  downloadSuperAdminUserAttendanceExcel,
  generateDatabaseBackup,
  exportSuperAdminOrganizationUsersExcel,
  exportAllSuperAdminUsersExcel,
  getSuperAdminLeads,
} = require("../controllers/super-admin.controller");
const {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  updateRolePermissions,
} = require("../controllers/permission.controller");
const { 
  getSuperAdminContactInquiries,
  getSuperAdminContactById,
  patchSuperAdminContact,
  deleteSuperAdminContact,
  deleteAllSuperAdminContacts
} = require("../controllers/contact.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Routes protected by authentication and role
router.use(userProtected, allowRoles("SUPER_ADMIN"));

router.get("/dashboard", getSuperAdminDashboard);
router.get("/dashboard/pdf", downloadSuperAdminDashboardPdf);
router.get("/dashboard/excel", downloadSuperAdminDashboardExcel);

// Super Admin Attendance & Reports Routes
router.get("/attendance/reports", getSuperAdminAttendanceReports);
router.get("/attendance/reports/pdf", downloadSuperAdminAttendanceReportsPdf);
router.get("/attendance/reports/excel", downloadSuperAdminAttendanceReportsExcel);
router.get("/attendance/users/:userId/logs", getSuperAdminUserAttendanceLogs);
router.get("/attendance/users/:userId/pdf", downloadSuperAdminUserAttendancePdf);
router.get("/attendance/users/:userId/excel", downloadSuperAdminUserAttendanceExcel);
router.get("/organizations", getSuperAdminOrganizations);
router.get("/leads", getSuperAdminLeads);
router.post("/organizations", createSuperAdminOrganization);
router.get("/organizations/pdf", downloadSuperAdminOrganizationsPdf);
router.get("/organizations/excel", downloadSuperAdminOrganizationsExcel);
router.get("/organizations/:organizationId", getSuperAdminOrganizationById);
router.get("/organizations/:organizationId/users", getSuperAdminOrganizationUsers);
router.get("/organizations/:organizationId/users/excel", exportSuperAdminOrganizationUsersExcel);
router.get("/organizations/:organizationId/teams", getSuperAdminOrganizationTeams);
router.patch("/organizations/:organizationId", patchSuperAdminOrganization);
router.get("/users", getAllSuperAdminUsers);
router.get("/users/excel", exportAllSuperAdminUsersExcel);
router.get("/users/:userId", getSuperAdminUserById);
router.patch("/users/:userId", patchSuperAdminUser);
router.patch("/organizations/:organizationId/access", updateOrganizationAccess);
router.post("/organizations/:organizationId/archive", archiveOrganizationAction);
router.post("/organizations/:organizationId/restore", restoreOrganizationAction);
router.post("/organizations/:organizationId/extend-plan", extendSuperAdminOrganizationPlan);
router.get("/contacts", getSuperAdminContactInquiries);
router.get("/contacts/:id", getSuperAdminContactById);
router.patch("/contacts/:id", patchSuperAdminContact);
router.delete("/contacts/:id", deleteSuperAdminContact);
router.delete("/contacts", deleteAllSuperAdminContacts);
router.get("/plans", getSuperAdminPlans);
router.get("/payments", getSuperAdminPayments);
router.get("/payments/pdf", downloadSuperAdminPaymentsPdf);
router.get("/payments/excel", downloadSuperAdminPaymentsExcel);
router.get("/payments/:paymentId", getSuperAdminPaymentById);
router.patch("/payments/:paymentId", updateSuperAdminPayment);
router.delete("/payments/:paymentId", deleteSuperAdminPayment);
router.get("/analytics", getSuperAdminAnalytics);

router.get("/settings", getSystemSettings);
router.patch("/settings", updateSystemSetting);

// Post Management
router.get("/posts", getSuperAdminPosts);
router.post("/posts", createSuperAdminPost);
router.patch("/posts/:id", updateSuperAdminPost);
router.delete("/posts/:id", deleteSuperAdminPost);

// RBAC Management
router.get("/permissions", getPermissions);
router.post("/permissions", createPermission);
router.patch("/permissions/:id", updatePermission);
router.delete("/permissions/:id", deletePermission);
router.get("/roles/permissions", getRolePermissions);
router.post("/roles/permissions", updateRolePermissions);

// Database Backup
router.get("/backup/download", generateDatabaseBackup);

module.exports = router;
