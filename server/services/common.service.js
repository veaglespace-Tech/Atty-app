const { normalizeRole } = require("../constants/rbac");

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

const todayKey = () => new Date().toISOString().split("T")[0];

const toDateKey = (value, fallback = null) => {
  if (!value) return fallback;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split("T")[0];
};

const normalizeStatus = (value, fallback = "") =>
  String(value || fallback)
    .trim()
    .toUpperCase();

const resolveOrganizationId = (user) => {
  const rawId = user?.organizationId || user?.organization || user?.orgId || null;
  const parsed = Number(rawId);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

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

module.exports = {
  clamp,
  parsePositiveInt,
  parseLimit,
  parseOffset,
  parseId,
  todayKey,
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
};
