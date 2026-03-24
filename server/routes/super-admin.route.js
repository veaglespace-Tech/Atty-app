const express = require("express");
const router = express.Router();
const {
  getSuperAdminDashboard,
  getSuperAdminOrganizations,
  updateOrganizationAccess,
  getSuperAdminPlans,
  getSuperAdminPayments,
  getSuperAdminAnalytics,
  downloadSuperAdminOrganizationsPdf,
  downloadSuperAdminOrganizationsExcel,
  downloadSuperAdminDashboardPdf,
  downloadSuperAdminDashboardExcel,
  downloadSuperAdminPaymentsPdf,
  downloadSuperAdminPaymentsExcel,
  archiveOrganizationAction,
  restoreOrganizationAction,
} = require("../controllers/super-admin.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");

// Routes protected by authentication and role
router.use(userProtected, allowRoles("SUPER_ADMIN"));

router.get("/dashboard", getSuperAdminDashboard);
router.get("/dashboard/pdf", downloadSuperAdminDashboardPdf);
router.get("/dashboard/excel", downloadSuperAdminDashboardExcel);
router.get("/organizations", getSuperAdminOrganizations);
router.get("/organizations/pdf", downloadSuperAdminOrganizationsPdf);
router.get("/organizations/excel", downloadSuperAdminOrganizationsExcel);
router.patch("/organizations/:organizationId/access", updateOrganizationAccess);
router.post("/organizations/:organizationId/archive", archiveOrganizationAction);
router.post("/organizations/:organizationId/restore", restoreOrganizationAction);
router.get("/plans", getSuperAdminPlans);
router.get("/payments", getSuperAdminPayments);
router.get("/payments/pdf", downloadSuperAdminPaymentsPdf);
router.get("/payments/excel", downloadSuperAdminPaymentsExcel);
router.get("/analytics", getSuperAdminAnalytics);

module.exports = router;
