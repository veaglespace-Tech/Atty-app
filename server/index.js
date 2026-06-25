require("./config/load-env")();
const Sentry = require("@sentry/node");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const { ensureEnv } = require("./config/env");

const getEnv = (key, fallback = "") => (process.env[key] || fallback).trim();
const runtimeEnv = ensureEnv();
const PORT = runtimeEnv.port;
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

const prisma = require("./lib/prisma");
const {
  startAttendanceAutoCloseScheduler,
  stopAttendanceAutoCloseScheduler,
} = require("./services/attendance-auto-close.service");
const app = express();

// Trust Nginx/Cloudflare proxy
app.set("trust proxy", 1);

const envAllowedOrigins = [process.env.CLIENT_URL, process.env.CLIENT_ORIGINS]
  .filter(Boolean)
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",

  "https://atty.veaglespace.com",
  "http://atty.veaglespace.com",

  "https://test.payu.in",
  "https://secure.payu.in",

  ...envAllowedOrigins,
]);

const localOriginPattern =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow if no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow null origin (often set by browsers during cross-origin POST redirects)
    if (origin === "null") return callback(null, true);

    if (allowedOrigins.has(origin) || localOriginPattern.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
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

app.use(helmet());
app.use(
  compression({
    threshold: 1024,
  }),
);
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use("/api", apiRateLimiter);
app.use(
  express.json({
    limit: getEnv("JSON_BODY_LIMIT", "10mb"),
  }),
);
app.use(
  express.urlencoded({ 
    limit: getEnv("JSON_BODY_LIMIT", "10mb"), 
    extended: true 
  })
);
app.use(cookieParser());
app.use("/api/auth/login", loginRateLimiter);

app.get("/healthz", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "veagle-attendee-server",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Number(process.uptime().toFixed(0)),
  });
});

app.get("/readyz", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
      message: "Database connection check failed",
    });
  }
});

app.use("/api/auth", require("./routes/auth.route"));
app.use("/api/org", require("./routes/org.route"));
app.use("/api/attendance", require("./routes/attendance.route"));
app.use("/api/dashboard", require("./routes/dashboard.route"));
app.use("/api/payment", require("./routes/payment.route"));
app.use("/api/plans", require("./routes/plan.route"));
app.use("/api/super-admin", require("./routes/super-admin.route"));
app.use("/api/team-leader", require("./routes/team-leader.route"));
app.use("/api/member", require("./routes/member.route"));
app.use("/api/posts", require("./routes/post.route"));
app.use("/api/atty", require("./routes/atty.route"));
app.use("/api/contact", require("./routes/contact.route"));

app.use("*", (req, res) => {
  res.status(404).json({ message: "resource not found" });
});

if (sentryEnabled) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isSchemaMismatchError =
    err?.code === "P2022" ||
    String(err?.message || "").toLowerCase().includes("does not exist in the current database");
  const clientMessage = isSchemaMismatchError
    ? "Server settings are updating. Please retry in a moment."
    : err.message || "Server Error";

  if (sentryEnabled) {
    Sentry.captureException(err);
  }
  res.status(statusCode).json({
    message: clientMessage,
    error: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

const listen = (port) =>
  new Promise((resolve, reject) => {
    const server = app.listen(port);

    server.once("listening", () => resolve(server));
    server.once("error", reject);
  });

const startServer = async () => {
  console.log("mysql/prisma connecting...");
  await prisma.$connect();
  console.log("mysql/prisma connected");

  await listen(PORT);
  startAttendanceAutoCloseScheduler();
  console.log(`server running on port ${PORT}`);
};

const shutdownServer = async () => {
  stopAttendanceAutoCloseScheduler();
  await prisma.$disconnect().catch(() => {});
};

if (process.env.NODE_ENV !== "test" && require.main === module) {
  startServer().catch(async (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(
        `Failed to start server: port ${PORT} is already in use. Stop the existing process or set PORT to a free port.`,
      );
    } else {
      console.error("Failed to start server:", error.message);
    }

    await shutdownServer();
    process.exit(1);
  });
}

module.exports = {
  app,
  startServer,
  shutdownServer,
};
