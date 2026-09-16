import { createSlice } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
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

const TOKEN_STORAGE_KEY = "token";

const getPersistedToken = async () => {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  }

  const secureToken = await SecureStore.getItemAsync(TOKEN_STORAGE_KEY);
  if (secureToken) return secureToken;

  // Migrate any token stored by older app builds out of AsyncStorage.
  const legacyToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (legacyToken) {
    await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, legacyToken);
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
  return legacyToken;
};

const persistToken = async (token) => {
  if (Platform.OS === "web") {
    if (token) await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    return;
  }

  if (token) await SecureStore.setItemAsync(TOKEN_STORAGE_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_STORAGE_KEY);
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
};

const persistSessionUser = async (user) => {
  if (!user) {
    await AsyncStorage.removeItem("user");
    return;
  }

  await AsyncStorage.setItem("user", JSON.stringify(user));
};

const COOKIE_SESSION_TOKEN = "__cookie_session__";

const persistRedirectPath = async (redirectPath) => {
  if (!redirectPath) {
    await AsyncStorage.removeItem("redirectPath");
    return;
  }

  await AsyncStorage.setItem("redirectPath", redirectPath);
};

export const loadPersistedSession = async () => {
  try {
    const rawUser = await AsyncStorage.getItem("user");
    const token = await getPersistedToken();
    const user = rawUser ? normalizeSessionUser(JSON.parse(rawUser)) : null;
    
    let redirectPath = null;
    if (user) {
      const storedRedirect = await AsyncStorage.getItem("redirectPath");
      redirectPath = resolveDashboardPath(
        user.currentRole,
        storedRedirect || user.dashboardPath
      );
    }
    
    return { user, token, redirectPath };
  } catch (_) {
    return { user: null, token: null, redirectPath: null };
  }
};

const clearPersistedSession = async () => {
  await AsyncStorage.removeItem("user");
  await persistToken(null);
  await AsyncStorage.removeItem("status");
  await AsyncStorage.removeItem("redirectPath");
  await AsyncStorage.removeItem("admin");
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
    hydrateFromStorage: (state, action) => {
      const user = action.payload?.user || null;
      const token = action.payload?.token || (user ? COOKIE_SESSION_TOKEN : null);
      const redirectPath = action.payload?.redirectPath || null;

      state.user = user;
      state.token = token;
      state.redirectPath = redirectPath;
      state.hydrated = true;
      state.loading = false;
    },
    setSession: (state, action) => {
      const nextUser = normalizeSessionUser(action.payload?.user);
      const nextToken = action.payload?.token || (nextUser ? COOKIE_SESSION_TOKEN : null);
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
      if (action.payload?.token) {
        persistToken(action.payload.token);
      }
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
