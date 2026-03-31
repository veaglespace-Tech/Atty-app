const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

const {
  ensureOrganizationId,
  parseLimit,
} = require("../services/common.service");
const {
  assertPermission,
} = require("../services/access.service");
const { normalizeCoordinatesInput } = require("../services/location.service");
const {
  buildAttendanceWhere,
  buildAttendanceSummary,
  mapAttendanceRecord,
} = require("../services/attendance-query.service");
const {
  attendanceRecordSelect,
} = require("../services/prisma-selects.service");
const { PERMISSION_KEYS } = require("../constants/permissions");

exports.getOrgAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);
  const limit = parseLimit(req.query.limit, 400, 2500);

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
  });

  const records = await prisma.attendance.findMany({
    where,
    select: attendanceRecordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  const items = records.map(mapAttendanceRecord);
  res.status(200).json({
    success: true,
    items,
    summary: buildAttendanceSummary(items),
    meta: {
      limit,
      total: items.length,
    },
  });
});

exports.getOrgAttendanceSettings = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      attendanceRadius: true,
      longitude: true,
      latitude: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    settings: {
      attendanceRadius: org?.attendanceRadius || 25,
      location:
        Number.isFinite(org?.longitude) && Number.isFinite(org?.latitude)
          ? [org.longitude, org.latitude]
          : null,
      updatedAt: org?.updatedAt || null,
    },
  });
});

exports.updateOrgAttendanceSettings = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_MANAGE);

  const attendanceRadius = Number(req.body?.attendanceRadius || 25);
  if (!Number.isFinite(attendanceRadius) || attendanceRadius < 5 || attendanceRadius > 1000) {
    res.status(400);
    throw new Error("attendanceRadius must be between 5 and 1000");
  }

  const coordinates = normalizeCoordinatesInput(req.body || {});
  if (!coordinates) {
    res.status(400);
    throw new Error("Valid coordinates are required");
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      attendanceRadius: Math.round(attendanceRadius),
      longitude: coordinates[0],
      latitude: coordinates[1],
    },
  });

  res.status(200).json({
    success: true,
    message: "Attendance settings updated successfully",
  });
});
