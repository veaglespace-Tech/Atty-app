import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const parseEnvList = (value) =>
  String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/** @type {import('next').NextConfig} */
const allowedDevOrigins = parseEnvList(process.env.NEXT_ALLOWED_DEV_ORIGINS);

const nextConfig = {
  reactCompiler: true,
  outputFileTracingRoot: projectRoot,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  turbopack: {
    root: projectRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
};

export default nextConfig;
