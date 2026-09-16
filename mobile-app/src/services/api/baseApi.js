import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { Platform } from "react-native";
import { logout } from "@/store/slices/authSlice";
import { API_BASE_URL as CONFIG_API_BASE_URL } from "@/config";

import { router } from "expo-router";

const DEFAULT_ANDROID_EMULATOR_API_URL = "http://10.0.2.2:5000/api";
const DEFAULT_IOS_SIMULATOR_API_URL = "http://127.0.0.1:5000/api";
const DEFAULT_PRODUCTION_API_URL = String(CONFIG_API_BASE_URL || "https://atty.veaglespace.com/api");

const trimTrailingSlash = (url) => String(url || "").trim().replace(/\/+$/, "");

const resolveApiBaseUrl = () => {
  const explicitApiUrl = trimTrailingSlash(
    process.env.EXPO_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL,
  );

  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  if (__DEV__) {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      return `http://${window.location.hostname}:5000/api`;
    }

    if (Platform.OS === "android") {
      return DEFAULT_ANDROID_EMULATOR_API_URL;
    }

    if (Platform.OS === "ios") {
      return DEFAULT_IOS_SIMULATOR_API_URL;
    }
  }

  return trimTrailingSlash(process.env.EXPO_PUBLIC_API_URL_PROD) || DEFAULT_PRODUCTION_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();

const createBaseQuery = (url, timeoutMs = 120000) => fetchBaseQuery({
  baseUrl: url,
  timeout: timeoutMs,
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

const rawBaseQuery = createBaseQuery(API_BASE_URL, __DEV__ ? 30000 : 30000);

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

    if (statusCode === 401 || (statusCode === 403 && shouldForceLogoutForForbidden(result.error))) {
      handleUnauthorizedSession(api, args);
    }

    // Sanitize non-JSON or cryptic errors into user-friendly messages
    let customMessage = "";
    if (result.error.status === "FETCH_ERROR") {
      customMessage = "Network error. Please check your internet connection.";
    } else if (result.error.status === "TIMEOUT_ERROR") {
      customMessage = "Request timed out. Please check your network connection.";
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
