const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const {
  ensureOrganizationId,
  monthWindow,
  minutesToHoursValue,
  parseLimit,
  toSummaryItem,
  todayKey,
  toPdfTime,
} = require("../services/common.service");
const {
  buildAttendanceWhere,
  buildAttendanceSummary,
  mapAttendanceRecord,
  buildUserAttendancePayload,
} = require("../services/attendance-query.service");
const { attendanceRecordSelect } = require("../services/prisma-selects.service");
const { buildGenericTablePdf } = require("../utils/pdf-report");
const { buildExportWorkbookBuffer } = require("../utils/excel-report");

const getCurrentMemberTeam = async ({ orgId, userId }) => {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      team: {
        orgId,
        deletedAt: null,
        isActive: true,
      },
    },
    select: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return membership?.team || null;
};

exports.getMemberDashboard = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  const today = todayKey();
  const { from, to } = monthWindow(new Date());

  const listWhere = buildAttendanceWhere({
    orgId,
    from: req.query.from,
    to: req.query.to,
    userIds: [userId],
  });

  const [todayRecord, monthlyStatus, monthlyAggregate, recentRecords, currentTeam] =
    await Promise.all([
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
        where: listWhere,
        select: attendanceRecordSelect,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: req.query.limit ? parseLimit(req.query.limit, 15, 365) : 15,
      }),
      getCurrentMemberTeam({
        orgId,
        userId,
      }),
    ]);

  const statusCountMap = monthlyStatus.reduce((acc, entry) => {
    acc[entry.status] = Number(entry._count?._all || 0);
    return acc;
  }, {});

  const presentCount = Number(statusCountMap.PRESENT || 0);
  const halfDayCount = Number(statusCountMap.HALF_DAY || 0);
  const absentCount = Number(statusCountMap.ABSENT || 0);
  const workedHours = minutesToHoursValue(monthlyAggregate?._sum?.totalMinutesWorked || 0);
  const items = recentRecords.map((record) => {
    const item = mapAttendanceRecord(record);

    if (!currentTeam) {
      return item;
    }

    return {
      ...item,
      teamId: currentTeam.id,
      teamName: currentTeam.name,
    };
  });

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Today Status", todayRecord?.status || "No Records"),
      toSummaryItem("Present This Month", presentCount + halfDayCount),
      toSummaryItem("Absent This Month", absentCount),
      toSummaryItem("Worked Hrs This Month", workedHours),
    ],
    items,
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
  const limit = parseLimit(req.query.limit, 90, 730);

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

exports.downloadMemberAttendancePdf = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  
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

exports.downloadMemberAttendanceExcel = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const userId = Number(req.user.id);
  
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
