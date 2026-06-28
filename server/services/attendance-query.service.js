const { minutesToHoursValue, todayKey, toDateKey, toSummaryItem, monthWindow, dateKey } = require("./common.service");
const { resolveAttendanceLateMinutes } = require("./attendance-time.service");
const { attendanceRecordSelect } = require("./prisma-selects.service");
const { resolveUserRole } = require("../utils/membership");
const prisma = require("../lib/prisma");

const mapAttendanceRecord = (record = {}) => {
  const user = record.user || {};
  const team =
    record.team && record.team.deletedAt == null && record.team.isActive !== false
      ? record.team
      : null;
  const punchInMeta = record.punchInLocationMeta || null;
  const punchOutMeta = record.punchOutLocationMeta || null;
  const punchInCoordinates =
    Number.isFinite(record.punchInLongitude) && Number.isFinite(record.punchInLatitude)
      ? [record.punchInLongitude, record.punchInLatitude]
      : null;
  const punchOutCoordinates =
    Number.isFinite(record.punchOutLongitude) && Number.isFinite(record.punchOutLatitude)
      ? [record.punchOutLongitude, record.punchOutLatitude]
      : null;

  return {
    id: record.id,
    _id: record.id,
    date: record.date,
    memberId: record.userId,
    member: user.name || "Unknown",
    role: resolveUserRole(user, record.orgId) || "MEMBER",
    status: record.status || "PRESENT",
    punchInAt: record.punchInAt,
    punchOutAt: record.punchOutAt,
    workedMinutes: Number(record.totalMinutesWorked || 0),
    workedHours: minutesToHoursValue(record.totalMinutesWorked || 0),
    lateMinutes: resolveAttendanceLateMinutes(record),
    punchInValid: record.isPunchInValid !== false,
    punchOutValid: record.isPunchOutValid !== false,
    punchInDistanceMeters: record.punchInDistanceMeters,
    punchOutDistanceMeters: record.punchOutDistanceMeters,
    punchInCoordinates,
    punchOutCoordinates,
    punchInLocationMeta: punchInMeta,
    punchOutLocationMeta: punchOutMeta,
    punchInSelfieUrl: record.punchInSelfieUrl || null,
    punchOutSelfieUrl: record.punchOutSelfieUrl || null,
    teamId: team?.id || null,
    teamName: team?.name || null,
  };
};

const buildAttendanceDateWhere = ({ date, from, to }) => {
  const normalizedDate = toDateKey(date);
  if (normalizedDate) {
    return normalizedDate;
  }

  const normalizedFrom = toDateKey(from);
  const normalizedTo = toDateKey(to);

  if (normalizedFrom || normalizedTo) {
    return {
      gte: normalizedFrom || undefined,
      lte: normalizedTo || undefined,
    };
  }

  return undefined;
};

const buildAttendanceWhere = ({
  orgId,
  date,
  from,
  to,
  status,
  userIds,
  teamIds,
  search,
}) => {
  const where = {
    deletedAt: null,
    date: buildAttendanceDateWhere({ date, from, to }),
  };

  if (orgId) {
    where.orgId = Number(orgId);
  }

  const normalizedStatus = String(status || "")
    .trim()
    .toUpperCase();
  if (normalizedStatus && normalizedStatus !== "ALL") {
    where.status = normalizedStatus;
  }

  if (Array.isArray(userIds) && userIds.length > 0) {
    where.userId = {
      in: userIds.map(Number),
    };
  }

  if (Array.isArray(teamIds) && teamIds.length > 0) {
    where.teamId = {
      in: teamIds.map(Number),
    };
  }

  if (search && String(search).trim().length > 0) {
    where.user = {
      OR: [
        { name: { contains: String(search).trim() } },
        { email: { contains: String(search).trim() } },
      ],
    };
  }

  return where;
};

const buildAttendanceSummary = (records = []) => {
  const totals = records.reduce(
    (acc, record) => {
      if (record.status === "PRESENT") acc.present += 1;
      else if (record.status === "HALF_DAY") acc.halfDay += 1;
      else if (record.status === "ABSENT") acc.absent += 1;
      return acc;
    },
    {
      present: 0,
      halfDay: 0,
      absent: 0,
    }
  );

  return [
    toSummaryItem("Records", records.length),
    toSummaryItem("Present", totals.present),
    toSummaryItem("Half Day", totals.halfDay),
    toSummaryItem("Absent", totals.absent),
  ];
};

const buildUserAttendancePayload = async ({ userId, orgId, period, fromInput, toInput }) => {
  const userWhere = { id: userId, deletedAt: null };
  if (orgId) {
    userWhere.orgId = orgId;
  }

  const user = await prisma.user.findFirst({
    where: userWhere,
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          organizationCode: true,
        },
      },
    },
  });

  if (!user) {
    const err = new Error("User not found or access denied");
    err.statusCode = 404;
    throw err;
  }

  const REPORT_PERIODS = new Set(["daily", "weekly", "monthly", "custom"]);
  const CUSTOM_REPORT_MIN_DAYS = 1;
  const CUSTOM_REPORT_MAX_DAYS = 364;
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  
  const normalizedPeriod = REPORT_PERIODS.has(String(period || "").trim().toLowerCase())
    ? String(period || "").trim().toLowerCase()
    : "monthly";

  let rangeFrom, rangeTo, periodLabel;
  const now = new Date();
  const today = todayKey();

  if (normalizedPeriod === "daily") {
    rangeFrom = today;
    rangeTo = today;
    periodLabel = "Daily";
  } else if (normalizedPeriod === "weekly") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    rangeFrom = dateKey(from);
    rangeTo = today;
    periodLabel = "Weekly";
  } else if (normalizedPeriod === "custom") {
    rangeFrom = toDateKey(fromInput);
    rangeTo = toDateKey(toInput);
    if (!rangeFrom || !rangeTo) {
      const err = new Error("Custom reports require both from and to dates.");
      err.statusCode = 400;
      throw err;
    }
    if (rangeFrom > rangeTo) {
      const err = new Error("From date cannot be after to date.");
      err.statusCode = 400;
      throw err;
    }
    if (rangeTo > today) {
      const err = new Error("Custom report range cannot extend into future dates.");
      err.statusCode = 400;
      throw err;
    }
    const fromDateObj = new Date(`${rangeFrom}T00:00:00.000Z`);
    const toDateObj = new Date(`${rangeTo}T00:00:00.000Z`);
    const customDays = Math.floor((toDateObj.getTime() - fromDateObj.getTime()) / DAY_IN_MS) + 1;
    if (customDays < CUSTOM_REPORT_MIN_DAYS || customDays > CUSTOM_REPORT_MAX_DAYS) {
      const err = new Error(`Custom report range must stay between ${CUSTOM_REPORT_MIN_DAYS} and ${CUSTOM_REPORT_MAX_DAYS} days.`);
      err.statusCode = 400;
      throw err;
    }
    periodLabel = "Custom";
  } else {
    const window = monthWindow(now);
    rangeFrom = window.from;
    rangeTo = today;
    periodLabel = "Monthly";
  }

  const logs = await prisma.attendance.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: rangeFrom, lte: rangeTo },
    },
    orderBy: { date: "desc" },
  });

  const totalRecords = logs.length;
  const presentDays = logs.filter(l => l.status === "PRESENT").length;
  const halfDays = logs.filter(l => l.status === "HALF_DAY").length;
  const absentDays = logs.filter(l => l.status === "ABSENT").length;
  const totalWorkedMinutes = logs.reduce((sum, l) => sum + Number(l.totalMinutesWorked || 0), 0);
  const workedHours = minutesToHoursValue(totalWorkedMinutes);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      orgName: user.organization?.name || "-",
      orgCode: user.organization?.organizationCode || "-",
    },
    summary: [
      { label: "Total Logs", value: totalRecords },
      { label: "Present Days", value: presentDays },
      { label: "Half Days", value: halfDays },
      { label: "Absent Days", value: absentDays },
      { label: "Worked Hrs", value: Number(workedHours.toFixed(2)) },
    ],
    items: logs.map(log => ({
      id: log.id,
      date: log.date,
      status: log.status,
      punchInAt: log.punchInAt,
      punchOutAt: log.punchOutAt,
      workedHours: minutesToHoursValue(log.totalMinutesWorked || 0),
      punchInValid: log.isPunchInValid,
      punchOutValid: log.isPunchOutValid,
      punchInLocationMeta: log.punchInLocationMeta,
      punchOutLocationMeta: log.punchOutLocationMeta,
      punchInSelfieUrl: log.punchInSelfieUrl,
      punchOutSelfieUrl: log.punchOutSelfieUrl,
    })),
    meta: {
      from: rangeFrom,
      to: rangeTo,
      period: normalizedPeriod,
      periodLabel,
    },
  };
};

const buildOrgAttendancePayload = async ({ orgId, period, fromInput, toInput, status, search }) => {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!org) {
    const err = new Error("Organization not found");
    err.statusCode = 404;
    throw err;
  }

  const REPORT_PERIODS = new Set(["daily", "weekly", "monthly", "custom"]);
  const CUSTOM_REPORT_MIN_DAYS = 1;
  const CUSTOM_REPORT_MAX_DAYS = 364;
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  
  const normalizedPeriod = REPORT_PERIODS.has(String(period || "").trim().toLowerCase())
    ? String(period || "").trim().toLowerCase()
    : "monthly";

  let rangeFrom, rangeTo, periodLabel;
  const now = new Date();
  const today = todayKey();

  if (normalizedPeriod === "daily") {
    rangeFrom = today;
    rangeTo = today;
    periodLabel = "Daily";
  } else if (normalizedPeriod === "weekly") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    rangeFrom = dateKey(from);
    rangeTo = today;
    periodLabel = "Weekly";
  } else if (normalizedPeriod === "custom") {
    rangeFrom = toDateKey(fromInput);
    rangeTo = toDateKey(toInput);
    if (!rangeFrom || !rangeTo) {
      const err = new Error("Custom reports require both from and to dates.");
      err.statusCode = 400;
      throw err;
    }
    if (rangeFrom > rangeTo) {
      const err = new Error("From date cannot be after to date.");
      err.statusCode = 400;
      throw err;
    }
    if (rangeTo > today) {
      const err = new Error("Custom report range cannot extend into future dates.");
      err.statusCode = 400;
      throw err;
    }
    const fromDateObj = new Date(`${rangeFrom}T00:00:00.000Z`);
    const toDateObj = new Date(`${rangeTo}T00:00:00.000Z`);
    const customDays = Math.floor((toDateObj.getTime() - fromDateObj.getTime()) / DAY_IN_MS) + 1;
    if (customDays < CUSTOM_REPORT_MIN_DAYS || customDays > CUSTOM_REPORT_MAX_DAYS) {
      const err = new Error(`Custom report range must stay between ${CUSTOM_REPORT_MIN_DAYS} and ${CUSTOM_REPORT_MAX_DAYS} days.`);
      err.statusCode = 400;
      throw err;
    }
    periodLabel = "Custom";
  } else {
    const window = monthWindow(now);
    rangeFrom = window.from;
    rangeTo = today;
    periodLabel = "Monthly";
  }

  const where = buildAttendanceWhere({
    orgId,
    from: rangeFrom,
    to: rangeTo,
    status,
    search,
  });

  const records = await prisma.attendance.findMany({
    where,
    select: attendanceRecordSelect,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 2500,
  });

  const existingItems = records.map(mapAttendanceRecord);
  const items = await augmentWithAbsentees({
    orgId,
    teamIds: [],
    from: rangeFrom,
    to: rangeTo,
    status,
    existingItems,
  });
  
  const summary = buildAttendanceSummary(items);

  return {
    organization: org,
    summary,
    items: items.slice(0, 2500),
    meta: {
      period: normalizedPeriod,
      periodLabel,
      from: rangeFrom,
      to: rangeTo,
      total: items.length,
    },
  };
};

const augmentWithAbsentees = async ({ orgId, teamIds, date, from, to, status, existingItems }) => {
  const { todayKey } = require('./common.service');
  const { resolveUserRole } = require('../utils/membership');
  const prisma = require('../lib/prisma');

  const dates = [];
  let currentStr = '';
  let endStr = '';

  if (date) {
    currentStr = date;
    endStr = date;
  } else if (from || to) {
    currentStr = from || '2000-01-01';
    endStr = to || todayKey();
  } else {
    currentStr = todayKey();
    endStr = todayKey();
  }

  const current = new Date(currentStr + 'T00:00:00.000Z');
  const end = new Date(endStr + 'T00:00:00.000Z');
  const today = new Date(todayKey() + 'T00:00:00.000Z');

  if (end > today) end.setTime(today.getTime());

  let days = 0;
  while (current <= end && days < 31) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
    days++;
  }

  const usersWhere = { orgId, deletedAt: null };
  if (teamIds && teamIds.length > 0) {
    usersWhere.teamMemberships = { some: { teamId: { in: teamIds.map(Number) } } };
  }

  const users = await prisma.user.findMany({
    where: usersWhere,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      memberships: {
        where: { orgId },
        select: { role: true }
      },
      teamMemberships: {
        where: teamIds && teamIds.length > 0 ? { teamId: { in: teamIds.map(Number) } } : undefined,
        select: { team: { select: { id: true, name: true } } },
        take: 1
      }
    }
  });

  const existingMap = new Set();
  for (const item of existingItems) {
    // use memberId (mapped field) instead of item.user.id which doesn't exist after mapping
    const uid = item.memberId ?? item.userId ?? item.user?.id;
    existingMap.add(uid + '_' + item.date);
  }

  const absentItems = [];
  const statusFilter = String(status || '').toUpperCase();

  if (statusFilter && statusFilter !== 'ALL' && statusFilter !== 'ABSENT') {
    return existingItems;
  }

  for (const d of dates) {
    for (const u of users) {
      if (!existingMap.has(u.id + '_' + d)) {
        const team = u.teamMemberships[0]?.team;
        absentItems.push({
          id: 'absent_' + u.id + '_' + d,
          date: d,
          userId: u.id,
          user: {
            id: u.id,
            name: u.name,
            email: u.email,
          },
          role: resolveUserRole(u, orgId) || 'MEMBER',
          status: 'ABSENT',
          punchInAt: null,
          punchOutAt: null,
          workedMinutes: 0,
          workedHours: '0h 0m',
          lateMinutes: 0,
          punchInValid: false,
          punchOutValid: false,
          punchInDistanceMeters: null,
          punchOutDistanceMeters: null,
          punchInCoordinates: null,
          punchOutCoordinates: null,
          punchInLocationMeta: null,
          punchOutLocationMeta: null,
          punchInSelfieUrl: null,
          punchOutSelfieUrl: null,
          teamId: team?.id || null,
          teamName: team?.name || null,
        });
      }
    }
  }

  let finalItems = existingItems;
  if (statusFilter === 'ABSENT') {
    finalItems = finalItems.filter(item => item.status === 'ABSENT');
  }

  const combined = [...finalItems, ...absentItems];
  combined.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (a.user.name || '').localeCompare(b.user.name || '');
  });

  return combined;
};

module.exports = {
  attendanceRecordSelect,
  mapAttendanceRecord,
  buildAttendanceDateWhere,
  buildAttendanceWhere,
  buildAttendanceSummary,
  buildUserAttendancePayload,
  buildOrgAttendancePayload,
  augmentWithAbsentees,
};
