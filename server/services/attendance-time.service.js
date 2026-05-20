const DEFAULT_ATTENDANCE_TIMEZONE = "Asia/Kolkata";
const DEFAULT_ATTENDANCE_START_TIME = "09:00";
const DEFAULT_ATTENDANCE_END_TIME = "18:00";
const DEFAULT_ATTENDANCE_LATE_GRACE_MINUTES = 0;

const buildTimeFormatter = (timeZone) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

const buildDatePartsFormatter = (timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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
  endTime: String(process.env.ATTENDANCE_END_TIME || DEFAULT_ATTENDANCE_END_TIME).trim(),
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

const resolveTimeOfDayMinutes = (value, timeZone = null) => {
  const config = readAttendanceTimeConfig();
  const resolvedTimeZone = sanitizeTimeZone(timeZone || config.timeZone);
  return resolvePunchInMinutes(value, resolvedTimeZone);
};

const parseDateKey = (value) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return { year, month, day };
};

const extractDatePartsInTimeZone = (date, timeZone) => {
  const parts = buildDatePartsFormatter(timeZone).formatToParts(date);
  const map = parts.reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
};

const buildDateTimeForDateKey = ({
  dateKey,
  time = DEFAULT_ATTENDANCE_END_TIME,
  timeZone = null,
} = {}) => {
  const dateParts = parseDateKey(dateKey);
  if (!dateParts) return new Date();

  const minutesOfDay = parseStartTimeMinutes(time);
  const targetHour = Math.floor(minutesOfDay / 60);
  const targetMinute = minutesOfDay % 60;
  const config = readAttendanceTimeConfig();
  const resolvedTimeZone = sanitizeTimeZone(timeZone || config.timeZone);

  let candidate = new Date(
    Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, targetHour, targetMinute, 0, 0)
  );

  for (let index = 0; index < 5; index += 1) {
    const current = extractDatePartsInTimeZone(candidate, resolvedTimeZone);

    const currentDateUtc = Date.UTC(current.year, current.month - 1, current.day);
    const targetDateUtc = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day);
    const dayDeltaMinutes = Math.round((targetDateUtc - currentDateUtc) / 86400000) * 1440;
    const minuteDelta = targetHour * 60 + targetMinute - (current.hour * 60 + current.minute);
    const totalDeltaMinutes = dayDeltaMinutes + minuteDelta;

    if (totalDeltaMinutes === 0) break;
    candidate = new Date(candidate.getTime() + totalDeltaMinutes * 60000);
  }

  return candidate;
};

const resolveShiftDurationMinutes = ({ startTime = null, endTime = null } = {}) => {
  const config = readAttendanceTimeConfig();
  const startMinutes = parseStartTimeMinutes(startTime || config.startTime);
  const endMinutes = parseStartTimeMinutes(endTime || config.endTime);

  if (endMinutes <= startMinutes) {
    return 9 * 60;
  }

  return endMinutes - startMinutes;
};

const calculateAttendanceStatus = ({
  totalMinutesWorked = 0,
  startTime = null,
  endTime = null,
} = {}) => {
  const workedMinutes = Number(totalMinutesWorked || 0);
  const safeWorkedMinutes = Number.isFinite(workedMinutes) && workedMinutes > 0 ? workedMinutes : 0;
  const shiftDurationMinutes = resolveShiftDurationMinutes({ startTime, endTime });
  const halfDayThreshold = Math.floor(shiftDurationMinutes / 2);

  if (safeWorkedMinutes >= shiftDurationMinutes) return "PRESENT";
  if (safeWorkedMinutes >= halfDayThreshold) return "HALF_DAY";
  return "ABSENT";
};

module.exports = {
  DEFAULT_ATTENDANCE_LATE_GRACE_MINUTES,
  DEFAULT_ATTENDANCE_END_TIME,
  DEFAULT_ATTENDANCE_START_TIME,
  DEFAULT_ATTENDANCE_TIMEZONE,
  calculateAttendanceStatus,
  calculateLateMinutes,
  buildDateTimeForDateKey,
  parseStartTimeMinutes,
  readAttendanceTimeConfig,
  resolveAttendanceLateMinutes,
  resolveTimeOfDayMinutes,
  resolveShiftDurationMinutes,
};
