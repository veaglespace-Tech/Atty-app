const { minutesToHoursValue, todayKey, toDateKey, toSummaryItem } = require("./common.service");
const { resolveAttendanceLateMinutes } = require("./attendance-time.service");
const { resolveUserRole } = require("../utils/membership");

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

  return todayKey();
};

const buildAttendanceWhere = ({
  orgId,
  date,
  from,
  to,
  status,
  userIds,
  teamIds,
}) => {
  const where = {
    orgId: Number(orgId),
    deletedAt: null,
    date: buildAttendanceDateWhere({ date, from, to }),
  };

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

module.exports = {
  mapAttendanceRecord,
  buildAttendanceDateWhere,
  buildAttendanceWhere,
  buildAttendanceSummary,
};
