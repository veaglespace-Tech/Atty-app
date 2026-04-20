import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "@/store/slices/authSlice";
import { normalizeRole, ROLES } from "@/utils/roles";
import { API_BASE_URL as CONFIG_API_BASE_URL } from "@/config";

export const API_BASE_URL = CONFIG_API_BASE_URL.replace(/\/+$/, "");

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
