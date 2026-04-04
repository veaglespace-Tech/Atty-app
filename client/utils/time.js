export const minutesToHoursValue = (minutes, decimals = 2) => {
  const totalMinutes = Number(minutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return 0;
  }

  return Number((totalMinutes / 60).toFixed(decimals));
};

export const formatHoursValue = (value, options = {}) => {
  const { fromMinutes = false, decimals = 2 } = options;
  const numericValue = fromMinutes ? minutesToHoursValue(value, decimals) : Number(value || 0);
  const safeValue = Number.isFinite(numericValue) && numericValue > 0 ? numericValue : 0;
  return safeValue.toFixed(decimals);
};
