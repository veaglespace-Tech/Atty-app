const { CLIENT_BASE_URL } = require("./index");

const trimValue = (value) => String(value || "").trim();

const parsePort = (value, fallback = 5000) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
    return fallback;
  }
  return parsed;
};

const parseRateLimitMax = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const ensureEnv = () => {
  const errors = [];
  const nodeEnv = trimValue(process.env.NODE_ENV || "development") || "development";
  const isTest = nodeEnv === "test";
  const isProduction = nodeEnv === "production";

  if (!trimValue(process.env.JWT_KEY)) {
    errors.push("JWT_KEY is required.");
  }

  if (!trimValue(process.env.DATABASE_URL)) {
    errors.push("DATABASE_URL is required.");
  }

  if (isProduction) {
    const hasClientOrigin = Boolean(
      trimValue(process.env.CLIENT_URL) ||
      trimValue(process.env.CLIENT_ORIGINS) ||
      trimValue(CLIENT_BASE_URL)
    );
    if (!hasClientOrigin) {
      errors.push("CLIENT_URL, CLIENT_ORIGINS, or CLIENT_BASE_URL fallback is required in production.");
    }
  }

  if (errors.length > 0 && !isTest) {
    const formatted = errors.map((message) => `- ${message}`).join("\n");
    throw new Error(`Environment validation failed:\n${formatted}`);
  }

  return {
    nodeEnv,
    isTest,
    isProduction,
    port: parsePort(process.env.PORT, 5000),
    loginRateLimitMax: parseRateLimitMax(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  };
};

module.exports = {
  ensureEnv,
};
