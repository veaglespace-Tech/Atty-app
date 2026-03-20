const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const {
  ensureOrganizationId,
  parseLimit,
  toSummaryItem,
  todayKey,
} = require("../services/common.service");
const {
  buildAttendanceWhere,
  buildAttendanceSummary,
  mapAttendanceRecord,
} = require("../services/attendance-query.service");
const { attendanceRecordSelect } = require("../services/prisma-selects.service");

const monthWindow = (date = new Date()) => {
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
};

exports.getMemberDashboard = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  const today = todayKey();
  const { from, to } = monthWindow(new Date());

  const [todayRecord, monthlyStatus, monthlyAggregate, recentRecords] = await Promise.all([
    prisma.attendance.findFirst({
      where: {
        orgId,
        userId,
        date: today,
        deletedAt: null,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.attendance.groupBy({
      by: ["status"],
      where: {
        orgId,
        userId,
        deletedAt: null,
        date: {
          gte: from,
          lte: to,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.attendance.aggregate({
      where: {
        orgId,
        userId,
        deletedAt: null,
        date: {
          gte: from,
          lte: to,
        },
      },
      _sum: {
        totalMinutesWorked: true,
      },
    }),
    prisma.attendance.findMany({
      where: {
        orgId,
        userId,
        deletedAt: null,
      },
      select: attendanceRecordSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 15,
    }),
  ]);

  const statusCountMap = monthlyStatus.reduce((acc, entry) => {
    acc[entry.status] = Number(entry._count?._all || 0);
    return acc;
  }, {});

  const presentCount = Number(statusCountMap.PRESENT || 0);
  const halfDayCount = Number(statusCountMap.HALF_DAY || 0);
  const absentCount = Number(statusCountMap.ABSENT || 0);
  const workedHours = Number(
    (Number(monthlyAggregate?._sum?.totalMinutesWorked || 0) / 60).toFixed(2)
  );

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Today Status", todayRecord?.status || "NO_RECORD"),
      toSummaryItem("Present This Month", presentCount + halfDayCount),
      toSummaryItem("Absent This Month", absentCount),
      toSummaryItem("Worked Hours This Month", workedHours),
    ],
    items: recentRecords.map(mapAttendanceRecord),
    meta: {
      monthFrom: from,
      monthTo: to,
      today,
      totalRecords: recentRecords.length,
    },
  });
});

exports.getMemberAttendance = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  const limit = parseLimit(req.query.limit, 60, 365);

  const where = buildAttendanceWhere({
    orgId,
    date: req.query.date,
    from: req.query.from,
    to: req.query.to,
    status: req.query.status,
    userIds: [userId],
  });

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      select: attendanceRecordSelect,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  const items = records.map(mapAttendanceRecord);

  res.status(200).json({
    success: true,
    items,
    summary: buildAttendanceSummary(items),
    meta: {
      total,
      limit,
    },
  });
});
