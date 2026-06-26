const Sentry = require("@sentry/node");

const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();

const initSentry = () => {
  const sentryDsn = getEnv("SENTRY_DSN");
  const sentryEnabled = Boolean(sentryDsn);

  if (sentryEnabled) {
    Sentry.init({
      dsn: sentryDsn,
      environment: getEnv("NODE_ENV", "development"),
      tracesSampleRate: Number(getEnv("SENTRY_TRACES_SAMPLE_RATE", "0")) || 0,
      integrations: [Sentry.expressIntegration()],
    });
  }

  return { sentryEnabled, Sentry };
};

module.exports = { initSentry };
