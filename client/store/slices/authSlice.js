import { createSlice } from "@reduxjs/toolkit";
import {
  getMembershipForOrg,
  getUserOrganizationId,
  getUserRoleForOrg,
  normalizeMembership,
  normalizeMemberships,
  resolveDashboardPath,
  resolveUserPermissions,
} from "@/utils/roles";

const normalizeSessionUser = (user) => {
  if (!user || typeof user !== "object") return null;

  const organization =
    user.organization && typeof user.organization === "object" ? user.organization : null;
  const memberships = normalizeMemberships(user.memberships);
  const organizationId = getUserOrganizationId(
    {
      ...user,
      organization,
      memberships,
    },
    organization?.id
  );
  const currentMembership =
    getMembershipForOrg(
      {
        ...user,
        organization,
        memberships,
      },
      organizationId
    ) || normalizeMembership(user.currentMembership);
  const currentRole =
    getUserRoleForOrg(
      {
        ...user,
        organization,
        organizationId,
        memberships,
        currentMembership,
      },
      organizationId
    ) || null;
  const permissions = resolveUserPermissions(
    {
      ...user,
      organization,
      organizationId,
      memberships,
      currentMembership,
      currentRole,
    },
    organizationId
  );

  return {
    ...user,
    memberships,
    currentMembership,
    currentRole,
    permissions,
    organization,
    organizationId,
    organizationCode: user.organizationCode || organization?.organizationCode || null,
    city: user.city || organization?.city || null,
    dashboardPath: resolveDashboardPath(currentRole, user.dashboardPath),
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

const COOKIE_SESSION_TOKEN = "__cookie_session__";

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
      redirectPath: null,
    };
  }

  const user = parseStoredUser();
  const redirectPath = user
    ? resolveDashboardPath(
        user.currentRole,
        localStorage.getItem("redirectPath") || user.dashboardPath
      )
    : null;

  return {
    user,
    redirectPath,
  };
};

const clearPersistedSession = () => {
  if (typeof window === "undefined") return;

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
    loading: true,
    error: null,
  },
  reducers: {
    hydrateFromStorage: (state) => {
      const { user, redirectPath } = readPersistedSession();

      state.user = user;
      state.token = user ? COOKIE_SESSION_TOKEN : null;
      state.redirectPath = redirectPath;
      state.hydrated = true;
      state.loading = true;
    },
    setSession: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload?.user);
      const nextToken = nextUser ? COOKIE_SESSION_TOKEN : null;
      const nextRedirectPath = nextUser
        ? resolveDashboardPath(
            nextUser.currentRole,
            action.payload?.redirectPath || action.payload?.user?.dashboardPath
          )
        : null;

      state.user = nextUser;
      state.token = nextToken;
      state.redirectPath = nextRedirectPath;
      state.hydrated = true;
      state.loading = false;

      persistSessionUser(nextUser);
      persistRedirectPath(nextRedirectPath);
    },
    setCurrentUser: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload);
      const nextRedirectPath = nextUser
        ? resolveDashboardPath(nextUser.currentRole, state.redirectPath || nextUser.dashboardPath)
        : null;

      state.user = nextUser;
      state.token = nextUser ? COOKIE_SESSION_TOKEN : null;
      state.redirectPath = nextRedirectPath;
      state.hydrated = true;
      state.loading = false;

      persistSessionUser(nextUser);
      persistRedirectPath(nextRedirectPath);
    },
    markSessionChecked: (state) => {
      state.hydrated = true;
      state.loading = false;
      if (!state.user) {
        state.token = null;
        state.redirectPath = null;
      }
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

export const { hydrateFromStorage, setSession, setCurrentUser, markSessionChecked, logout } =
  authSlice.actions;
export default authSlice.reducer;
