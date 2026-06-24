const express = require("express");
const router = express.Router();
const {
  getMemberDashboard,
  getMemberAttendance,
  downloadMemberAttendancePdf,
  downloadMemberAttendanceExcel,
} = require("../controllers/member.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.use(userProtected, checkActiveSubscription, allowRoles("MEMBER"));

router.get("/dashboard", getMemberDashboard);
router.get("/attendance", getMemberAttendance);
router.get("/attendance/pdf", downloadMemberAttendancePdf);
router.get("/attendance/excel", downloadMemberAttendanceExcel);

module.exports = router;

