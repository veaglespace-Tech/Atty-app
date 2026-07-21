export const formatCalendarDate = (value, fallback = "Not active") => {
  if (!value) return fallback;

  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

export const APP_TIME_ZONE = "Asia/Kolkata";

export const getDateKey = (value = new Date(), timeZone = APP_TIME_ZONE) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

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

  if (!partMap.year || !partMap.month || !partMap.day) return "";
  return `${partMap.year}-${partMap.month}-${partMap.day}`;
};

export const getTodayDateKey = () => getDateKey(new Date());
