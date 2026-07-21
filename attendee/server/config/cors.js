const getAllowedOrigins = () => {
  const envAllowedOrigins = [process.env.CLIENT_URL, process.env.CLIENT_ORIGINS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return new Set([
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
};

const localOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow if no origin (server-to-server, curl, etc.)
    if (!origin) return callback(null, true);

    // Allow null origin (often set by browsers during cross-origin POST redirects)
    if (origin === "null") return callback(null, true);

    const allowedOrigins = getAllowedOrigins();
    if (allowedOrigins.has(origin) || localOriginPattern.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
};

module.exports = { corsOptions };
