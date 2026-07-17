import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "@/store/slices/authSlice";
import { normalizeRole, ROLES } from "@/utils/roles";
import { API_BASE_URL as CONFIG_API_BASE_URL } from "@/config";

const DEFAULT_LOCAL_API_URL = "http://localhost:5000/api";
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

const resolveApiBaseUrl = () => {
  const explicitApiUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL);
  if (explicitApiUrl) {
    return explicitApiUrl;
  }

  const localApiUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL_LOCAL)
    || DEFAULT_LOCAL_API_URL;
  const productionApiUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL_PROD)
    || DEFAULT_PRODUCTION_API_URL;

  if (typeof window !== "undefined") {
    if (isLocalHost(window.location.hostname)) {
      if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
        return `http://${window.location.hostname}:5000/api`;
      }
      return localApiUrl;
    }
    return productionApiUrl;
  }

  return process.env.NODE_ENV === "production" ? productionApiUrl : localApiUrl;
};

export const API_BASE_URL = resolveApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  credentials: "include",
  cache: "no-store",
  prepareHeaders: (headers) => {
    headers.set("cache-control", "no-cache, no-store, max-age=0");
    headers.set("pragma", "no-cache");
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
  if (typeof window === "undefined") return;

  const role = normalizeRole(api.getState?.()?.auth?.user?.currentRole);
  const currentPath = window.location.pathname;

  if (role === ROLES.ORG_ADMIN) {
    if (!currentPath.startsWith("/pricing")) {
      window.location.replace("/pricing?renew=1");
    }
    return;
  }

  api.dispatch(logout());
  if (currentPath !== "/subscription-expired") {
    window.location.replace("/subscription-expired");
  }
};

const handleUnauthorizedSession = (api, args) => {
  if (typeof window === "undefined") return;

  const requestUrl = resolveRequestUrl(args);
  if (isAuthMutationRequest(requestUrl)) {
    return;
  }

  api.dispatch(logout());

  const currentPath = window.location.pathname || "/";
  const isProtectedPath = PROTECTED_APP_ROOTS.some((root) => currentPath.startsWith(root));

  if (!isProtectedPath) {
    return;
  }

  const isSuperAdminRoute = currentPath.startsWith("/super-admin");
  const loginPath = isSuperAdminRoute ? "/super-admin/login" : "/login";

  if (currentPath !== loginPath) {
    window.location.replace(loginPath);
  }
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
