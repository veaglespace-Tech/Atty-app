const { normalizeRole } = require("../constants/rbac");

const { resolveOrganizationId: resolveMembershipOrganizationId } = require("../utils/membership");

const parsePositiveInt = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const clamp = (value, min, max) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const parseLimit = (value, fallback = 50, max = 500) => {
  const parsed = parsePositiveInt(value, fallback);
  return clamp(parsed, 1, max);
};

const parseOffset = (value, fallback = 0, max = 100000) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return clamp(Math.floor(parsed), 0, max);
};

const parseId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const DEFAULT_APP_TIME_ZONE = process.env.APP_TIME_ZONE || "Asia/Kolkata";

const getDatePartsInTimeZone = (value = new Date(), timeZone = DEFAULT_APP_TIME_ZONE) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const partMap = parts.reduce((accumulator, part) => {
    accumulator[part.type] = part.value;
    return accumulator;
  }, {});

  if (!partMap.year || !partMap.month || !partMap.day) return null;
  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
  };
};

const toDateKeyFromParts = (parts) => {
  if (!parts) return null;
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
};

const dateKey = (value = new Date(), timeZone = DEFAULT_APP_TIME_ZONE) =>
  toDateKeyFromParts(getDatePartsInTimeZone(value, timeZone));

const todayKey = (timeZone = DEFAULT_APP_TIME_ZONE) => dateKey(new Date(), timeZone);

const monthWindow = (value = new Date(), timeZone = DEFAULT_APP_TIME_ZONE) => {
  const parts = getDatePartsInTimeZone(value, timeZone);
  if (!parts) {
    const fallbackKey = dateKey(new Date()) || new Date().toISOString().split("T")[0];
    return {
      from: fallbackKey,
      to: fallbackKey,
    };
  }

  const lastDay = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  return {
    from: `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-01`,
    to: `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

const toDateKey = (value, fallback = null) => {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fallback;
  return dateKey(date) || fallback;
};

const normalizeStatus = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .toUpperCase();

const resolveOrganizationId = (user) => resolveMembershipOrganizationId(user);

const ensureOrganizationId = (req, res) => {
  const organizationId = resolveOrganizationId(req.user);
  if (!organizationId) {
    res.status(403);
    throw new Error("Organization context missing");
  }
  return organizationId;
};

const assertAllowedRoles = (res, userRole, ...allowedRoles) => {
  const normalizedRole = normalizeRole(userRole);
  const normalizedAllowed = allowedRoles.map((role) => normalizeRole(role));
  if (!normalizedAllowed.includes(normalizedRole)) {
    res.status(403);
    throw new Error("You do not have permission to access this resource");
  }
  return normalizedRole;
};

const parseBoolean = (value, fallback = null) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return fallback;
};

const toSummaryItem = (label, value) => ({
  label,
  value,
});

const uniqueNumberList = (values = []) =>
  [...new Set(values.map((value) => parseId(value)).filter(Boolean))];

const truncateText = (value, limit = 191) =>
  String(value || "")
    .trim()
    .slice(0, limit);

const formatDate = (date) => {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const minutesToHoursValue = (minutes, decimals = 2) => {
  const totalMinutes = Number(minutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return 0;
  }

  return Number((totalMinutes / 60).toFixed(decimals));
};

const formatHoursValue = (value, options = {}) => {
  const { fromMinutes = false, decimals = 2 } = options;
  const numericValue = fromMinutes ? minutesToHoursValue(value, decimals) : Number(value || 0);
  const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
  return safeValue.toFixed(decimals);
};

const normalizeQueryValue = (value) => String(value || "").trim();

module.exports = {
  clamp,
  parsePositiveInt,
  parseLimit,
  parseOffset,
  parseId,
  dateKey,
  todayKey,
  monthWindow,
  toDateKey,
  normalizeStatus,
  resolveOrganizationId,
  ensureOrganizationId,
  assertAllowedRoles,
  parseBoolean,
  toSummaryItem,
  uniqueNumberList,
  truncateText,
  formatDate,
  minutesToHoursValue,
  formatHoursValue,
  normalizeQueryValue,
};
