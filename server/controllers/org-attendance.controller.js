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

const ATTENDANCE_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const normalizeAttendanceTime = (value, fallback) => {
  const raw = String(value ?? "").trim();
  if (!raw) return fallback;
  const match = raw.match(ATTENDANCE_TIME_PATTERN);
  if (!match) return null;
  const hours = String(Number(match[1])).padStart(2, "0");
  const minutes = String(Number(match[2])).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const toMinutesFromTime = (hhmm) => {
  const [hours, minutes] = String(hhmm || "00:00")
    .split(":")
    .map((part) => Number(part));
  return hours * 60 + minutes;
};

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
      attendanceStartTime: true,
      attendanceEndTime: true,
      lateGraceMinutes: true,
      updatedAt: true,
    },
  });

  res.status(200).json({
    success: true,
    settings: {
      attendanceRadius: org?.attendanceRadius || 25,
      attendanceStartTime: org?.attendanceStartTime || "09:00",
      attendanceEndTime: org?.attendanceEndTime || "18:00",
      lateGraceMinutes: Number(org?.lateGraceMinutes || 0),
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
  assertPermission(res, req.user, PERMISSION_KEYS.LOCATION_SET);

  const attendanceRadius = Number(req.body?.attendanceRadius || 25);
  if (!Number.isFinite(attendanceRadius) || attendanceRadius < 5 || attendanceRadius > 1000) {
    res.status(400);
    throw new Error("attendanceRadius must be between 5 and 1000");
  }

  const attendanceStartTime = normalizeAttendanceTime(req.body?.attendanceStartTime, "09:00");
  const attendanceEndTime = normalizeAttendanceTime(req.body?.attendanceEndTime, "18:00");
  if (!attendanceStartTime || !attendanceEndTime) {
    res.status(400);
    throw new Error("attendanceStartTime and attendanceEndTime must be in HH:mm format");
  }

  if (toMinutesFromTime(attendanceEndTime) <= toMinutesFromTime(attendanceStartTime)) {
    res.status(400);
    throw new Error("attendanceEndTime must be later than attendanceStartTime");
  }

  const lateGraceMinutes = Number(req.body?.lateGraceMinutes ?? 0);
  if (!Number.isFinite(lateGraceMinutes) || lateGraceMinutes < 0 || lateGraceMinutes > 180) {
    res.status(400);
    throw new Error("lateGraceMinutes must be between 0 and 180");
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
      attendanceStartTime,
      attendanceEndTime,
      lateGraceMinutes: Math.floor(lateGraceMinutes),
      longitude: coordinates[0],
      latitude: coordinates[1],
    },
  });

  res.status(200).json({
    success: true,
    message: "Attendance settings updated successfully",
  });
});
