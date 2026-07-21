const express = require("express");
const router = express.Router();
const {
  getMemberDashboard,
  getMemberAttendance,
  downloadMemberAttendancePdf,
  downloadMemberAttendanceExcel,
  getMemberInstruments,
} = require("../controllers/member.controller");
const { userProtected } = require("../middlewares/auth.middleware");
const { requireMembership } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");

router.use(userProtected, checkActiveSubscription, requireMembership());

router.get("/dashboard", getMemberDashboard);
router.get("/attendance", getMemberAttendance);
router.get("/attendance/pdf", downloadMemberAttendancePdf);
router.get("/attendance/excel", downloadMemberAttendanceExcel);
router.get("/instruments", getMemberInstruments);

module.exports = router;

