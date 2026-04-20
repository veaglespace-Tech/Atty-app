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
    return isLocalHost(window.location.hostname) ? localApiUrl : productionApiUrl;
  }

  return process.env.NODE_ENV === "production" ? productionApiUrl : localApiUrl;
};

export const API_BASE_URL = resolveApiBaseUrl();

const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const stateToken = getState?.()?.auth?.token;

      if (stateToken) {
        headers.set("authorization", `Bearer ${stateToken}`);
        return headers;
      }

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("token");
        if (token) {
          headers.set("authorization", `Bearer ${token}`);
        }
      }
      return headers;
    },
  });

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

export const buildBaseQuery = () => async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 402) {
    redirectForExpiredSubscription(api);
  }

  return result;
};
