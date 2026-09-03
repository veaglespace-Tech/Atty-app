const prisma = require("../lib/prisma");
const { minutesToHoursValue, toSummaryItem, todayKey } = require("./common.service");
const { reportUserSelect } = require("./prisma-selects.service");
const { mapUserForManagement } = require("./user-query.service");

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
      acc.regularizedDays += Number(item.regularizedDays || 0);
      acc.halfDays += Number(item.halfDays || 0);
      acc.absentDays += Number(item.absentDays || 0);
      acc.overtimeDays += Number(item.overtimeDays || 0);
      acc.workedMinutes += Number(item.workedMinutes || 0);
      return acc;
    },
    {
      presentDays: 0,
      regularizedDays: 0,
      halfDays: 0,
      absentDays: 0,
      overtimeDays: 0,
      workedMinutes: 0,
    }
  );

  return [
    toSummaryItem("Members", items.length),
    toSummaryItem("Present Days", totals.presentDays),
    toSummaryItem("Regularized Days", totals.regularizedDays),
    toSummaryItem("Half Days", totals.halfDays),
    toSummaryItem("Absent Days", totals.absentDays),
    toSummaryItem("Overtime Days", totals.overtimeDays),
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

  // --- 1. Fetch ALL team members (so absent-only members appear in the report) ---
  const usersWhere = { orgId: Number(orgId), deletedAt: null };
  if (normalizedTeamIds.length > 0) {
    usersWhere.teamMemberships = { some: { teamId: { in: normalizedTeamIds } } };
  }

  const allUsers = await prisma.user.findMany({
    where: usersWhere,
    select: {
      id: true,
      name: true,
      role: true,
      orgId: true,
      department: {
        select: { name: true },
      },
      gender: true,
      dob: true,
      existingMember: true,
      referenceBy: true,
      bloodGroup: true,
      emergencyContact: true,
      currentAddress: true,
      permanentAddress: true,
      createdAt: true,
      permissions: true,
      memberships: {
        where: { orgId: Number(orgId) },
        select: { role: true, orgId: true, isActive: true, joinedAt: true },
      },
    },
  });

  let userIdsInTeams = null;
  if (normalizedTeamIds.length > 0) {
    userIdsInTeams = allUsers.map((u) => Number(u.id));
    if (userIdsInTeams.length === 0) {
      return {
        summary: toReportSummary([]),
        items: [],
        recordsCount: 0,
      };
    }
  }

  // --- 2. Query attendance grouped stats ---
  const where = {
    orgId: Number(orgId),
    deletedAt: null,
    date: {
      gte: rangeFrom,
      lte: rangeTo,
    },
    ...(userIdsInTeams !== null
      ? {
          userId: {
            in: userIdsInTeams,
          },
        }
      : {}),
  };

  const groupedRows = await prisma.attendance.groupBy({
    by: ["userId", "date", "status"],
    where,
    _count: {
      _all: true,
    },
    _sum: {
      totalMinutesWorked: true,
    },
  });

  // --- 3. Calculate total working days in range (capped at today) ---
  const startDate = new Date(rangeFrom + "T00:00:00.000Z");
  const todayStr = todayKey();
  const endStr = rangeTo > todayStr ? todayStr : rangeTo;
  const endDate = new Date(endStr + "T00:00:00.000Z");
  let totalDays = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    totalDays++;
    cursor.setDate(cursor.getDate() + 1);
  }

  // --- 4. Build report map starting with ALL members ---
  const reportMap = new Map();

  for (const user of allUsers) {
    const userId = Number(user.id);
    reportMap.set(userId, {
      id: userId,
      member: user?.name || "Unknown",
      role: mapUserForManagement(user, orgId).role,
      department: user?.department?.name || "Unassigned",
      gender: user?.gender || "-",
      dob: user?.dob || "-",
      existingMember: user?.existingMember || "-",
      referenceBy: user?.referenceBy || "-",
      bloodGroup: user?.bloodGroup || "-",
      emergencyContact: user?.emergencyContact || "-",
      currentAddress: user?.currentAddress || "-",
      permanentAddress: user?.permanentAddress || "-",
      joinedAt: user?.memberships?.[0]?.joinedAt ? new Date(user.memberships[0].joinedAt).toLocaleDateString("en-IN") : user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN") : "-",
      presentDays: 0,
      regularizedDays: 0,
      halfDays: 0,
      absentDays: 0,
      overtimeDays: 0,
      workedMinutes: 0,
      daily: {},
    });
  }

  // --- 5. Overlay attendance data ---
  for (const row of groupedRows) {
    const userId = Number(row.userId);
    const current = reportMap.get(userId) || {
      id: userId,
      member: "Unknown",
      role: "MEMBER",
      presentDays: 0,
      regularizedDays: 0,
      halfDays: 0,
      absentDays: 0,
      overtimeDays: 0,
      workedMinutes: 0,
      daily: {},
    };

    const status = String(row.status || "").toUpperCase();
    const count = Number(row._count?._all || 0);
    const workedMinutes = Number(row._sum?.totalMinutesWorked || 0);

    if (status === "PRESENT") current.presentDays += count;
    else if (status === "REGULARIZED") current.regularizedDays += count;
    else if (status === "HALF_DAY") current.halfDays += count;
    else if (status === "ABSENT") current.absentDays += count;
    else if (status === "OVERTIME") current.overtimeDays += count;

    if (row.date) {
      current.daily[row.date] = status;
    }

    current.workedMinutes += workedMinutes;
    reportMap.set(userId, current);
  }

  // --- 6. For members with fewer recorded days than totalDays, fill the rest as absent ---
  for (const entry of reportMap.values()) {
    const recordedDays = entry.presentDays + entry.regularizedDays + entry.halfDays + entry.absentDays + entry.overtimeDays;
    if (recordedDays < totalDays) {
      entry.absentDays += (totalDays - recordedDays);
    }
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
