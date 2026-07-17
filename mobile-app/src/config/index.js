const DEFAULT_CLIENT_BASE_URL = "https://atty.veaglespace.com";
const DEFAULT_API_BASE_URL = `${DEFAULT_CLIENT_BASE_URL}/api`;

const trimTrailingSlash = (value) => String(value || "").trim().replace(/\/+$/, "");

const stripApiSuffix = (value) => value.replace(/\/api$/i, "");

const configuredApiBaseUrl = trimTrailingSlash(
  process.env.EXPO_PUBLIC_API_URL_PROD || process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL_PROD || process.env.NEXT_PUBLIC_API_URL,
);

export const API_BASE_URL = configuredApiBaseUrl || DEFAULT_API_BASE_URL;

export const CLIENT_BASE_URL = trimTrailingSlash(process.env.EXPO_PUBLIC_CLIENT_BASE_URL || process.env.NEXT_PUBLIC_CLIENT_BASE_URL)
  || stripApiSuffix(API_BASE_URL)
  || DEFAULT_CLIENT_BASE_URL;
