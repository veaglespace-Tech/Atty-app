const prisma = require("../lib/prisma");
const { minutesToHoursValue, toSummaryItem } = require("./common.service");
const { reportUserSelect } = require("./prisma-selects.service");
const { resolveUserRole } = require("../utils/membership");

const compareReportEntries = (left, right) => {
  const leftName = String(left?.member || "").trim().toLowerCase();
  const rightName = String(right?.member || "").trim().toLowerCase();
  if (leftName !== rightName) return leftName.localeCompare(rightName);

  const leftRole = String(left?.role || "").trim().toLowerCase();
  const rightRole = String(right?.role || "").trim().toLowerCase();
  if (leftRole !== rightRole) return leftRole.localeCompare(rightRole);

  return Number(left?.id || 0) - Number(right?.id || 0);
};

const toReportSummary = (items = []) => {
  const totals = items.reduce(
    (acc, item) => {
      acc.presentDays += Number(item.presentDays || 0);
      acc.absentDays += Number(item.absentDays || 0);
      acc.workedMinutes += Number(item.workedMinutes || 0);
      return acc;
    },
    {
      presentDays: 0,
      absentDays: 0,
      workedMinutes: 0,
    }
  );

  return [
    toSummaryItem("Members", items.length),
    toSummaryItem("Present Days", totals.presentDays),
    toSummaryItem("Absent Days", totals.absentDays),
    toSummaryItem("Worked Hrs", minutesToHoursValue(totals.workedMinutes)),
  ];
};

const buildAttendanceReport = async ({
  orgId,
  rangeFrom,
  rangeTo,
  teamIds = [],
  sortByWorkedMinutes = false,
}) => {
  const normalizedTeamIds = Array.isArray(teamIds)
    ? teamIds.map(Number).filter((value) => Number.isFinite(value) && value > 0)
    : [];

  const where = {
    orgId: Number(orgId),
    deletedAt: null,
    date: {
      gte: rangeFrom,
      lte: rangeTo,
    },
    ...(normalizedTeamIds.length > 0
      ? {
          teamId: {
            in: normalizedTeamIds,
          },
        }
      : {}),
  };

  const groupedRows = await prisma.attendance.groupBy({
    by: ["userId", "status"],
    where,
    _count: {
      _all: true,
    },
    _sum: {
      totalMinutesWorked: true,
    },
  });

  if (groupedRows.length === 0) {
    return {
      summary: toReportSummary([]),
      items: [],
      recordsCount: 0,
    };
  }

  const userIds = [...new Set(groupedRows.map((row) => Number(row.userId)).filter(Boolean))];
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
    select: reportUserSelect,
  });

  const userMap = new Map(users.map((user) => [Number(user.id), user]));
  const reportMap = new Map();

  for (const row of groupedRows) {
    const userId = Number(row.userId);
      const user = userMap.get(userId);
      const current = reportMap.get(userId) || {
        id: userId,
        member: user?.name || "Unknown",
        role: resolveUserRole(user, orgId) || "MEMBER",
        presentDays: 0,
        halfDays: 0,
        absentDays: 0,
      workedMinutes: 0,
    };

    const status = String(row.status || "").toUpperCase();
    const count = Number(row._count?._all || 0);
    const workedMinutes = Number(row._sum?.totalMinutesWorked || 0);

    if (status === "PRESENT") current.presentDays += count;
    else if (status === "HALF_DAY") current.halfDays += count;
    else if (status === "ABSENT") current.absentDays += count;

    current.workedMinutes += workedMinutes;
    reportMap.set(userId, current);
  }

  const items = [...reportMap.values()].map((entry) => ({
    ...entry,
    workedHours: minutesToHoursValue(entry.workedMinutes),
  }));

  if (sortByWorkedMinutes) {
    items.sort((a, b) => {
      if (Number(b.workedMinutes || 0) !== Number(a.workedMinutes || 0)) {
        return Number(b.workedMinutes || 0) - Number(a.workedMinutes || 0);
      }
      return compareReportEntries(a, b);
    });
  } else {
    items.sort(compareReportEntries);
  }

  return {
    summary: toReportSummary(items),
    items,
    recordsCount: groupedRows.reduce((sum, row) => sum + Number(row._count?._all || 0), 0),
  };
};

module.exports = {
  buildAttendanceReport,
  toReportSummary,
};
