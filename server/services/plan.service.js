const normalizePlanCode = (code) =>
  String(code || "")
    .trim()
    .toUpperCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-");

const isLegacyPaidMonthlyPlan = (plan = {}) => {
  const durationInDays = Number(plan?.durationInDays || 0);
  const price = Number(plan?.price || 0);
  const code = String(plan?.code || "")
    .trim()
    .toUpperCase();

  return price > 0 && (durationInDays === 30 || /(?:^|[_-])1M(?:$|[_-])/.test(code));
};

const filterVisiblePlans = (plans = []) =>
  (Array.isArray(plans) ? plans : []).filter((plan) => !isLegacyPaidMonthlyPlan(plan));

module.exports = {
  filterVisiblePlans,
  isLegacyPaidMonthlyPlan,
  normalizePlanCode,
};
