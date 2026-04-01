const express = require("express");
const router = express.Router();
const {
  getSuperAdminDashboard,
  getSuperAdminOrganizations,
  getSuperAdminOrganizationById,
  patchSuperAdminOrganization,
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
} = require("../controllers/super-admin.controller");
const { getSuperAdminContactInquiries } = require("../controllers/contact.controller");
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
router.get("/organizations/:organizationId", getSuperAdminOrganizationById);
router.patch("/organizations/:organizationId", patchSuperAdminOrganization);
router.patch("/organizations/:organizationId/access", updateOrganizationAccess);
router.post("/organizations/:organizationId/archive", archiveOrganizationAction);
router.post("/organizations/:organizationId/restore", restoreOrganizationAction);
router.get("/contacts", getSuperAdminContactInquiries);
router.get("/plans", getSuperAdminPlans);
router.get("/payments", getSuperAdminPayments);
router.get("/payments/pdf", downloadSuperAdminPaymentsPdf);
router.get("/payments/excel", downloadSuperAdminPaymentsExcel);
router.get("/payments/:paymentId", getSuperAdminPaymentById);
router.patch("/payments/:paymentId", updateSuperAdminPayment);
router.delete("/payments/:paymentId", deleteSuperAdminPayment);
router.get("/analytics", getSuperAdminAnalytics);

module.exports = router;
