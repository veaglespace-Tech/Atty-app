const rateLimit = require("express-rate-limit");
const { ensureEnv } = require("./env");

const runtimeEnv = ensureEnv();

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many requests, please try again later.",
  },
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: runtimeEnv.loginRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login attempts, please try again after 15 minutes.",
  },
});

module.exports = { apiRateLimiter, loginRateLimiter };
