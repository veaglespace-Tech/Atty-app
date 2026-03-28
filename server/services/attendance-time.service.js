const DEFAULT_ATTENDANCE_TIMEZONE = "Asia/Kolkata";
const DEFAULT_ATTENDANCE_START_TIME = "09:00";
const DEFAULT_ATTENDANCE_LATE_GRACE_MINUTES = 0;

const buildTimeFormatter = (timeZone) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

const sanitizeTimeZone = (value) => {
  const candidate = String(value || "").trim();
  if (!candidate) return DEFAULT_ATTENDANCE_TIMEZONE;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch (_) {
    return DEFAULT_ATTENDANCE_TIMEZONE;
  }
};

const parseStartTimeMinutes = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return 9 * 60;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 9 * 60;
  }

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return 9 * 60;
  }

  return hours * 60 + minutes;
};

const parseGraceMinutes = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_ATTENDANCE_LATE_GRACE_MINUTES;
  }

  return Math.floor(parsed);
};

const readAttendanceTimeConfig = () => ({
  timeZone: sanitizeTimeZone(process.env.ATTENDANCE_TIMEZONE),
  startTime: String(process.env.ATTENDANCE_START_TIME || DEFAULT_ATTENDANCE_START_TIME).trim(),
  graceMinutes: parseGraceMinutes(process.env.ATTENDANCE_LATE_GRACE_MINUTES),
});

const resolvePunchInMinutes = (punchInAt, timeZone) => {
  if (!punchInAt) return null;

  const date = punchInAt instanceof Date ? punchInAt : new Date(punchInAt);
  if (Number.isNaN(date.getTime())) return null;

  const formatted = buildTimeFormatter(timeZone).format(date);
  const match = String(formatted).match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
};

const calculateLateMinutes = ({
  punchInAt,
  startTime = null,
  graceMinutes = null,
  timeZone = null,
} = {}) => {
  const config = readAttendanceTimeConfig();
  const resolvedTimeZone = sanitizeTimeZone(timeZone || config.timeZone);
  const resolvedStartMinutes = parseStartTimeMinutes(startTime || config.startTime);
  const resolvedGraceMinutes =
    graceMinutes === null || graceMinutes === undefined
      ? config.graceMinutes
      : parseGraceMinutes(graceMinutes);
  const punchInMinutes = resolvePunchInMinutes(punchInAt, resolvedTimeZone);

  if (punchInMinutes === null) return 0;

  return Math.max(punchInMinutes - resolvedStartMinutes - resolvedGraceMinutes, 0);
};

const resolveAttendanceLateMinutes = (record = {}) => {
  const storedLateMinutes = Number(record?.lateMinutes || 0);
  if (storedLateMinutes > 0) {
    return storedLateMinutes;
  }

  return calculateLateMinutes({
    punchInAt: record?.punchInAt,
  });
};

module.exports = {
  DEFAULT_ATTENDANCE_LATE_GRACE_MINUTES,
  DEFAULT_ATTENDANCE_START_TIME,
  DEFAULT_ATTENDANCE_TIMEZONE,
  calculateLateMinutes,
  readAttendanceTimeConfig,
  resolveAttendanceLateMinutes,
};
