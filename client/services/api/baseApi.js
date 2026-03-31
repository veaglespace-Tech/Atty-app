import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { logout } from "@/store/slices/authSlice";
import { normalizeRole, ROLES } from "@/utils/roles";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/+$/, "");

const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: "include",
    prepareHeaders: (headers) => {
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

  const role = normalizeRole(api.getState?.()?.auth?.user?.role);
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
