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

export const formatDurationHmsFromMinutes = (minutes) => {
  const totalMinutes = Number(minutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0h 0m 0s";
  }

  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const remainingSecondsAfterHours = totalSeconds % 3600;
  const mins = Math.floor(remainingSecondsAfterHours / 60);
  const secs = remainingSecondsAfterHours % 60;

  return `${hours}h ${mins}m ${secs}s`;
};

export const formatDurationHmFromMinutes = (minutes) => {
  const totalMinutes = Number(minutes || 0);
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);

  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};
