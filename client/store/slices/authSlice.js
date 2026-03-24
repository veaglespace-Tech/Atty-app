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

const persistToken = (token) => {
  if (typeof window === "undefined") return;

  if (!token) {
    localStorage.removeItem("token");
    return;
  }

  localStorage.setItem("token", token);
};

const persistRedirectPath = (redirectPath) => {
  if (typeof window === "undefined") return;

  if (!redirectPath) {
    localStorage.removeItem("redirectPath");
    return;
  }

  localStorage.setItem("redirectPath", redirectPath);
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

const readPersistedSession = () => {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      redirectPath: null,
    };
  }

  const token = localStorage.getItem("token");
  const user = parseStoredUser();
  const redirectPath = user
    ? resolveDashboardPath(user.role, localStorage.getItem("redirectPath") || user.dashboardPath)
    : null;

  return {
    user,
    token,
    redirectPath,
  };
};

const clearPersistedSession = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("status");
  localStorage.removeItem("redirectPath");
  localStorage.removeItem("admin");
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
      const { token, user, redirectPath } = readPersistedSession();

      state.user = user;
      state.token = token;
      state.redirectPath = redirectPath;
      state.hydrated = true;
      state.loading = false;
    },
    setSession: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload?.user);
      const nextToken = action.payload?.token || null;
      const nextRedirectPath = nextUser
        ? resolveDashboardPath(
            nextUser.role,
            action.payload?.redirectPath || action.payload?.user?.dashboardPath
          )
        : null;

      state.user = nextUser;
      state.token = nextToken;
      state.redirectPath = nextRedirectPath;
      state.hydrated = true;
      state.loading = false;

      persistToken(nextToken);
      persistSessionUser(nextUser);
      persistRedirectPath(nextRedirectPath);
    },
    setCurrentUser: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload);
      const nextRedirectPath = nextUser
        ? resolveDashboardPath(nextUser.role, state.redirectPath || nextUser.dashboardPath)
        : null;

      state.user = nextUser;
      state.redirectPath = nextRedirectPath;
      state.hydrated = true;
      state.loading = false;

      persistToken(state.token);
      persistSessionUser(nextUser);
      persistRedirectPath(nextRedirectPath);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.redirectPath = null;
      state.hydrated = true;
      state.loading = false;
      clearPersistedSession();
    },
  },
});

export const { hydrateFromStorage, setSession, setCurrentUser, logout } = authSlice.actions;
export default authSlice.reducer;
