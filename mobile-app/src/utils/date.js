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

  try {
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

    if (partMap.year && partMap.month && partMap.day) {
      return `${partMap.year}-${partMap.month}-${partMap.day}`;
    }
  } catch (error) {
    // Ignore and fallback if Intl or timeZone is not supported
  }

  // Fallback for Hermes/environments without full Intl support
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDateKey = () => getDateKey(new Date());

export const getWeekRange = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    from: getDateKey(monday),
    to: getDateKey(sunday),
  };
};

export const getMonthRange = (date = new Date()) => {
  const d = new Date(date);
  const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  
  return {
    from: getDateKey(firstDay),
    to: getDateKey(lastDay),
  };
};

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
