const PLAN_ACRONYMS = new Set(["AI", "API", "GPS", "HR", "ID", "INR", "PDF", "UPI"]);

const normalizePlanTokens = (value) =>
  String(value || "")
    .trim()
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatToken = (token) => {
  const upperToken = token.toUpperCase();
  if (!token) return "";
  if (PLAN_ACRONYMS.has(upperToken)) return upperToken;
  if (/^\d+[A-Z]+$/i.test(token)) return upperToken;
  if (/^\d+$/.test(token)) return token;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
};

export const formatPlanCodeLabel = (code) =>
  normalizePlanTokens(code)
    .split(" ")
    .filter(Boolean)
    .map((token) => formatToken(token))
    .join(" ");

export const formatPlanNameLabel = (name, code = "") => {
  const rawName = String(name || "").trim();
  if (!rawName) return formatPlanCodeLabel(code) || "Plan";
  if (/[_]/.test(rawName)) return formatPlanCodeLabel(rawName);
  return rawName.replace(/\s+/g, " ").trim();
};

export const formatPlanPrice = (amount) => {
  const numeric = Number(amount || 0);
  if (!Number.isFinite(numeric)) return String(amount ?? "--");
  return numeric.toLocaleString("en-IN");
};

export const formatPlanDurationShort = (days) => {
  const numeric = Number(days || 0);
  if (numeric === 7) return "7D";
  if (numeric === 365) return "12M";
  return `${Math.round(numeric / 30)}M`;
};

export const formatPlanDurationLong = (days) => {
  const numeric = Number(days || 0);
  if (numeric === 7) return "7 Days Trial";
  if (numeric === 365) return "12 Months";
  return `${Math.round(numeric / 30)} Months`;
};

export const isHiddenPaidMonthlyPlan = (plan = {}) => {
  const durationInDays = Number(plan?.durationInDays || 0);
  const price = Number(plan?.price || 0);
  const code = String(plan?.code || "")
    .trim()
    .toUpperCase();

  return price > 0 && (durationInDays === 30 || /(?:^|[_-])1M(?:$|[_-])/.test(code));
};

export const filterVisiblePlans = (plans = []) =>
  (Array.isArray(plans) ? plans : []).filter((plan) => !isHiddenPaidMonthlyPlan(plan));
