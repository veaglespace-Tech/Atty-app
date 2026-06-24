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
const xlsx = require("xlsx");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const { buildUserAttendancePayload } = require("../services/attendance-query.service");
const { normalizeQueryValue } = require("../services/common.service");

const { buildExportWorkbookBuffer } = require("../utils/excel-report");

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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      attendanceRadius: true,
      attendanceStartTime: true,
      attendanceEndTime: true,
      lateGraceMinutes: true,
      longitude: true,
      latitude: true,
    },
  });

  if (!org) {
    res.status(404);
    throw new Error("Organization not found");
  }

  const updateData = {};

  if (req.body?.attendanceRadius !== undefined) {
    const attendanceRadius = Number(req.body.attendanceRadius);
    if (!Number.isFinite(attendanceRadius) || attendanceRadius < 5 || attendanceRadius > 1000) {
      res.status(400);
      throw new Error("attendanceRadius must be between 5 and 1000");
    }
    updateData.attendanceRadius = Math.round(attendanceRadius);
  }

  const newStartTime = req.body?.attendanceStartTime !== undefined 
    ? normalizeAttendanceTime(req.body.attendanceStartTime, null)
    : org.attendanceStartTime;
    
  const newEndTime = req.body?.attendanceEndTime !== undefined 
    ? normalizeAttendanceTime(req.body.attendanceEndTime, null)
    : org.attendanceEndTime;

  if (req.body?.attendanceStartTime !== undefined || req.body?.attendanceEndTime !== undefined) {
    if (!newStartTime || !newEndTime) {
      res.status(400);
      throw new Error("attendanceStartTime and attendanceEndTime must be in HH:mm format");
    }
    if (toMinutesFromTime(newEndTime) <= toMinutesFromTime(newStartTime)) {
      res.status(400);
      throw new Error("attendanceEndTime must be later than attendanceStartTime");
    }
    if (req.body?.attendanceStartTime !== undefined) updateData.attendanceStartTime = newStartTime;
    if (req.body?.attendanceEndTime !== undefined) updateData.attendanceEndTime = newEndTime;
  }

  if (req.body?.lateGraceMinutes !== undefined) {
    const lateGraceMinutes = Number(req.body.lateGraceMinutes);
    if (!Number.isFinite(lateGraceMinutes) || lateGraceMinutes < 0 || lateGraceMinutes > 180) {
      res.status(400);
      throw new Error("lateGraceMinutes must be between 0 and 180");
    }
    updateData.lateGraceMinutes = Math.floor(lateGraceMinutes);
  }

  if (req.body?.coordinates !== undefined) {
    const coordinates = normalizeCoordinatesInput(req.body);
    if (!coordinates) {
      res.status(400);
      throw new Error("Valid coordinates are required");
    }
    updateData.longitude = coordinates[0];
    updateData.latitude = coordinates[1];
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });
  }

  res.status(200).json({
    success: true,
    message: "Attendance settings updated successfully",
  });
});

exports.getOrgUserAttendanceLogs = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);
  
  const userId = Number(req.params.userId);
  const payload = await buildUserAttendancePayload({
    userId,
    orgId,
    period: req.query.period,
    fromInput: req.query.from,
    toInput: req.query.to,
  });
  res.status(200).json({ success: true, ...payload });
});

exports.downloadOrgUserAttendancePdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);
  
  const userId = Number(req.params.userId);
  const payload = await buildUserAttendancePayload({
    userId,
    orgId,
    period: req.query.period,
    fromInput: req.query.from,
    toInput: req.query.to,
  });

  const toPdfTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const subtitleLines = [
    `User: ${payload.user.name} (${payload.user.email})`,
    `Organization: ${payload.user.orgName} (${payload.user.orgCode})`,
    `Period: ${payload.meta.periodLabel} (${payload.meta.from} to ${payload.meta.to})`,
  ];

  const summaryCards = payload.summary.map(s => ({
    label: s.label,
    value: s.value,
  }));

  const pdfBuffer = await buildGenericTablePdf({
    title: "DETAILED USER ATTENDANCE LOGS",
    subtitleLines,
    summaryCards,
    columns: [
      { key: "entryNo", label: "No.", width: 40, align: "left" },
      { key: "date", label: "Date", width: 90 },
      { key: "status", label: "Status", width: 80, align: "center" },
      { key: "punchIn", label: "Punch In", width: 110, align: "center" },
      { key: "punchOut", label: "Punch Out", width: 110, align: "center" },
      { key: "workedHoursLabel", label: "Worked Hrs", width: 80, align: "center" },
      { key: "geoValid", label: "Geo Valid", width: 70, align: "center" },
    ],
    rows: payload.items.map((item, index) => {
      let geoValid = "Yes";
      if (item.punchInValid === false || item.punchOutValid === false) {
        geoValid = "No";
      } else if (item.punchInValid == null && item.punchOutValid == null) {
        geoValid = "-";
      }

      return {
        entryNo: String(index + 1).padStart(3, "0"),
        date: item.date,
        status: item.status,
        punchIn: item.punchInAt ? toPdfTime(item.punchInAt) : "-",
        punchOut: item.punchOutAt ? toPdfTime(item.punchOutAt) : "-",
        workedHoursLabel: item.workedHours.toFixed(2),
        geoValid,
      };
    }),
    size: "A4",
  });

  const safeName = String(payload.user.name || "user").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `attendance-logs-${safeName}-${payload.meta.from}-to-${payload.meta.to}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(pdfBuffer);
});

exports.downloadOrgUserAttendanceExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.ATTENDANCE_VIEW);
  
  const userId = Number(req.params.userId);
  const payload = await buildUserAttendancePayload({
    userId,
    orgId,
    period: req.query.period,
    fromInput: req.query.from,
    toInput: req.query.to,
  });

  const subtitleLines = [
    `User: ${payload.user.name} (${payload.user.email})`,
    `Organization: ${payload.user.orgName} (${payload.user.orgCode})`,
    `Period: ${payload.meta.periodLabel} (${payload.meta.from} to ${payload.meta.to})`,
    `Generated At: ${new Date().toLocaleString("en-IN")}`,
  ];

  const excelBuffer = buildExportWorkbookBuffer({
    title: "User Detailed Attendance Logs",
    subtitleLines,
    sheetName: "Daily Logs",
    columns: [
      { key: "entryNo", label: "No.", width: 42 },
      { key: "date", label: "Date", width: 80 },
      { key: "status", label: "Status", width: 68 },
      { key: "punchIn", label: "Punch In Time", width: 120 },
      { key: "punchOut", label: "Punch Out Time", width: 120 },
      { key: "workedHoursLabel", label: "Worked Hrs", width: 88 },
      { key: "geoValid", label: "Geo Valid", width: 64 },
    ],
    rows: payload.items.map((item, index) => {
      let geoValid = "Yes";
      if (item.punchInValid === false || item.punchOutValid === false) {
        geoValid = "No";
      } else if (item.punchInValid == null && item.punchOutValid == null) {
        geoValid = "-";
      }

      return {
        entryNo: String(index + 1).padStart(3, "0"),
        date: item.date,
        status: item.status,
        punchIn: item.punchInAt ? new Date(item.punchInAt).toLocaleString("en-IN") : "-",
        punchOut: item.punchOutAt ? new Date(item.punchOutAt).toLocaleString("en-IN") : "-",
        workedHoursLabel: item.workedHours.toFixed(2),
        geoValid,
      };
    }),
  });

  const safeName = String(payload.user.name || "user").replace(/[^a-z0-9_-]+/gi, "-");
  const filename = `attendance-logs-${safeName}-${payload.meta.from}-to-${payload.meta.to}.xlsx`;

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(excelBuffer);
});
