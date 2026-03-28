const normalizePlanCodeValue = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[-\s]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

export const formatPlanCodeLabel = (code) => normalizePlanCodeValue(code);

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
