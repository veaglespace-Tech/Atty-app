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

export const formatTimeAgo = (date) => {
  if (!date) return "";
  const time = typeof date === "string" ? new Date(date).getTime() : new Date(date).getTime();
  if (Number.isNaN(time)) return "";
  
  const now = Date.now();
  const diffInSeconds = Math.max(0, Math.floor((now - time) / 1000));
  
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
};
