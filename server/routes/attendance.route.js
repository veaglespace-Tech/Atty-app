const express = require("express");
const { z } = require("zod");
const router = express.Router();
const {
  punchIn,
  punchOut,
  getAttendance,
  getAttendanceSummary,
  getMyAttendance,
} = require("../controllers/attendance.controller");
const { verifyToken } = require("../middlewares/token.middleware");
const { allowRoles } = require("../middlewares/rbac.middleware");
const { checkActiveSubscription } = require("../middlewares/subscription.middleware");
const { validateBody } = require("../middlewares/validation.middleware");
const { resolveLocationPayload } = require("../services/location.service");

const attendanceLocationSchema = z
  .object({
    location: z.unknown().optional(),
    userLocation: z.unknown().optional(),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    const hasLocationPayload =
      Object.prototype.hasOwnProperty.call(value, "location") ||
      Object.prototype.hasOwnProperty.call(value, "userLocation");

    if (!hasLocationPayload) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location payload is required",
        path: ["location"],
      });
      return;
    }

    if (!resolveLocationPayload(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid location data. Provide coordinates as [lng, lat] or location object",
        path: ["location"],
      });
    }
  });

router.use(verifyToken);
router.use(allowRoles("ORG_ADMIN", "SUB_ADMIN", "TEAM_LEADER", "MEMBER"));
router.use(checkActiveSubscription);

router.post("/punch-in", validateBody(attendanceLocationSchema), punchIn);
router.post("/punch-out", validateBody(attendanceLocationSchema), punchOut);
router.get("/me", getMyAttendance);
router.get("/", getAttendance);
router.get("/summary", getAttendanceSummary);

module.exports = router;
