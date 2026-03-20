import { createSlice } from "@reduxjs/toolkit";
import { normalizeRole, resolveDashboardPath, resolveUserPermissions } from "@/utils/roles";

const normalizeSessionUser = (user) => {
  if (!user || typeof user !== "object") return null;

  const normalizedRole = normalizeRole(user.role);
  const organization =
    user.organization && typeof user.organization === "object" ? user.organization : null;
  const organizationId =
    user.organizationId || organization?.id || user.organization || null;

  return {
    ...user,
    role: normalizedRole,
    permissions: resolveUserPermissions({
      role: normalizedRole,
      permissions: user.permissions,
    }),
    organization,
    organizationId,
    organizationCode: user.organizationCode || organization?.organizationCode || null,
    city: user.city || organization?.city || null,
    dashboardPath: resolveDashboardPath(normalizedRole, user.dashboardPath),
  };
};

const persistSessionUser = (user) => {
  if (typeof window === "undefined") return;

  if (!user) {
    localStorage.removeItem("user");
    return;
  }

  localStorage.setItem("user", JSON.stringify(user));
};

const parseStoredUser = () => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) return null;

  try {
    return normalizeSessionUser(JSON.parse(raw));
  } catch (_) {
    return null;
  }
};

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    token: null,
    redirectPath: null,
    hydrated: false,
    loading: false,
    error: null,
  },
  reducers: {
    hydrateFromStorage: (state) => {
      if (typeof window === "undefined") {
        state.hydrated = true;
        return;
      }

      const token = localStorage.getItem("token");
      const user = parseStoredUser();
      const redirectPath = user
        ? resolveDashboardPath(user.role, localStorage.getItem("redirectPath") || user.dashboardPath)
        : null;

      state.user = user;
      state.token = token;
      state.redirectPath = redirectPath;
      state.hydrated = true;
      state.loading = false;
    },
    setCurrentUser: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload);
      state.user = nextUser;
      state.redirectPath = nextUser?.dashboardPath || null;
      state.hydrated = true;
      state.loading = false;
      persistSessionUser(nextUser);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.redirectPath = null;
      state.hydrated = true;
      state.loading = false;
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("status");
        localStorage.removeItem("redirectPath");
      }
    },
  },
});

export const { hydrateFromStorage, setCurrentUser, logout } = authSlice.actions;
export default authSlice.reducer;
