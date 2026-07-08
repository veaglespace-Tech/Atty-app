/**
 * Clean & Clear Debug Logger for Mobile App
 * Use this to standardize your console logs in development and suppress them in production.
 */

const isDev = __DEV__;

export const AppLogger = {
  log: (context, ...args) => {
    if (isDev) {
      console.log(`[🟢 LOG | ${context}]`, ...args);
    }
  },
  info: (context, ...args) => {
    if (isDev) {
      console.info(`[🔵 INFO | ${context}]`, ...args);
    }
  },
  warn: (context, ...args) => {
    if (isDev) {
      console.warn(`[🟠 WARN | ${context}]`, ...args);
    }
  },
  error: (context, error, ...args) => {
    // Errors might be logged even in production if sent to crash reporting (e.g. Sentry)
    console.error(`[🔴 ERROR | ${context}]`, error, ...args);
  },
  api: (method, endpoint, status, responseTimeMs) => {
    if (isDev) {
      const timeStr = responseTimeMs ? ` | ${responseTimeMs}ms` : '';
      console.log(`[🌐 API | ${method}] ${endpoint} => ${status}${timeStr}`);
    }
  }
};