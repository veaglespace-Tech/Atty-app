const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
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

const roleRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: async (req, res) => {
    if (!req.user) return 100;
    const role = req.user.currentRole || req.user.role;
    switch (role) {
      case "SUPER_ADMIN":
      case "ORG_ADMIN":
        return 1000;
      case "SUB_ADMIN":
      case "TEAM_LEADER":
        return 300;
      case "MEMBER":
      default:
        return 100;
    }
  },
  keyGenerator: (req, res) => {
    return req.user ? req.user.id.toString() : ipKeyGenerator(req, res);
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Rate limit exceeded for your role. Please try again later.",
  }
});

module.exports = { apiRateLimiter, loginRateLimiter, roleRateLimiter };
