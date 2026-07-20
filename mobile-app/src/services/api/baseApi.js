import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import { logout } from "@/store/slices/authSlice";
import { normalizeRole, ROLES } from "@/utils/roles";
import { API_BASE_URL as CONFIG_API_BASE_URL } from "@/config";

import { router } from "expo-router";

const DEFAULT_LOCAL_WEB_API_URL = "http://127.0.0.1:5001/api";
const DEFAULT_ANDROID_EMULATOR_API_URL = "http://10.76.5.20:5001/api";
const DEFAULT_IOS_SIMULATOR_API_URL = "http://10.76.5.20:5001/api";
const DEFAULT_PRODUCTION_API_URL = String(CONFIG_API_BASE_URL || "https://atty.veaglespace.com/api");

const trimTrailingSlash = (url) => String(url || "").trim().replace(/\/+$/, "");

const isLocalHost = (hostname) => {
  if (!hostname) return false;

  const normalizedHost = String(hostname).toLowerCase().trim();

  return (
    normalizedHost === "localhost" ||
    normalizedHost === "0.0.0.0" ||
    normalizedHost.startsWith("127.") ||
    normalizedHost.startsWith("10.") ||
    normalizedHost.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedHost)
  );
};

const resolveLocalApiBaseUrl = () => {
  if (Platform.OS === "android") {
    return DEFAULT_ANDROID_EMULATOR_API_URL;
  }
  if (Platform.OS === "ios") {
    return DEFAULT_IOS_SIMULATOR_API_URL;
  }
  return DEFAULT_LOCAL_WEB_API_URL;
};

const resolveApiBaseUrl = () => {
  const explicitApiUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL);
  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  if (__DEV__) {
    console.warn("No EXPO_PUBLIC_API_URL provided in .env, falling back to localhost.");
    return resolveLocalApiBaseUrl();
  }

  const productionApiUrl = trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL_PROD)
    || DEFAULT_PRODUCTION_API_URL;

  return productionApiUrl;
};

export const API_BASE_URL = resolveApiBaseUrl();
console.log("[API] Resolved Base URL (Cache Bust):", API_BASE_URL);

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    headers.set("cache-control", "no-cache, no-store, max-age=0");
    headers.set("pragma", "no-cache");
    // VERY IMPORTANT: Bypass Localtunnel and Ngrok warning pages!
    headers.set("Bypass-Tunnel-Reminder", "true");
    headers.set("ngrok-skip-browser-warning", "true");

    const token = getState()?.auth?.token;
    if (token && token !== "__cookie_session__") {
      headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

const PROTECTED_APP_ROOTS = ["/dashboard", "/org", "/member", "/team-leader", "/super-admin"];

const resolveRequestUrl = (args) => {
  if (typeof args === "string") return args;
  return String(args?.url || "");
};

const isAuthMutationRequest = (url) =>
  ["/auth/login", "/auth/forgot-password", "/auth/reset-password", "/auth/reset-password/validate"]
    .some((path) => String(url).includes(path));

const shouldForceLogoutForForbidden = (error) => {
  const message = String(error?.data?.message || error?.error || "").trim().toLowerCase();
  if (!message) return false;

  return [
    "your account has been removed",
    "your account is inactive",
    "your registration is pending approval",
    "your registration request was rejected",
    "you do not belong to the selected organization",
    "your organization membership is inactive",
    "no active organization membership found",
  ].some((fragment) => message.includes(fragment));
};

const redirectForExpiredSubscription = (api) => {
  const role = normalizeRole(api.getState?.()?.auth?.user?.currentRole);

  if (role === ROLES.ORG_ADMIN) {
    router.replace("/org/subscription");
    return;
  }

  api.dispatch(logout());
  router.replace("/login");
};

const handleUnauthorizedSession = (api, args) => {
  const requestUrl = resolveRequestUrl(args);
  if (isAuthMutationRequest(requestUrl)) {
    return;
  }

  api.dispatch(logout());
  
  // Note: For finer routing (like super-admin vs normal), we could check user state
  // But safely defaulting to /login is standard.
  router.replace("/login");
};

export const buildBaseQuery = () => async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error) {
    const statusCode = Number(result.error.status || result.error.originalStatus || 0);

    if (statusCode === 402) {
      redirectForExpiredSubscription(api);
    }

    if (statusCode === 401 || (statusCode === 403 && shouldForceLogoutForForbidden(result.error))) {
      handleUnauthorizedSession(api, args);
    }

    // Sanitize non-JSON or cryptic errors into user-friendly messages
    let customMessage = "";
    if (result.error.status === "FETCH_ERROR") {
      customMessage = "Network error. Please check your internet connection.";
    } else if (result.error.status === "PARSING_ERROR" || String(result.error.error).includes("SyntaxError")) {
      if (statusCode === 413) {
        customMessage = "The uploaded file or request is too large.";
      } else if (statusCode >= 500) {
        customMessage = "An unexpected server error occurred. Please try again later.";
      } else {
        customMessage = "The server returned an unexpected response. Please try again later.";
      }
    } else if (statusCode >= 500 && !result.error.data?.message) {
      customMessage = "An unexpected server error occurred. Please try again later.";
    } else if (statusCode === 413 && !result.error.data?.message) {
      customMessage = "The uploaded file or request is too large.";
    }

    if (customMessage) {
      result.error = {
        ...result.error,
        message: customMessage,
        data: {
          ...(typeof result.error.data === "object" ? result.error.data : {}),
          message: customMessage,
        },
      };
    } else if (result.error.data?.message) {
      // Ensure error.message exists if error.data.message exists
      result.error.message = result.error.data.message;
    }
  }

  return result;
};
