export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  SUB_ADMIN: "SUB_ADMIN",
  TEAM_LEADER: "TEAM_LEADER",
  MEMBER: "MEMBER",

  // Backward-compatible aliases used by existing dashboard code.
  ADMIN: "ORG_ADMIN",
  SUBADMIN: "SUB_ADMIN",
};

export const ROLE_ALIASES = Object.freeze({
  SUPERADMIN: ROLES.SUPER_ADMIN,
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
  ORGADMIN: ROLES.ORG_ADMIN,
  ORG_ADMIN: ROLES.ORG_ADMIN,
  ADMIN: ROLES.ORG_ADMIN,
  SUBADMIN: ROLES.SUB_ADMIN,
  SUB_ADMIN: ROLES.SUB_ADMIN,
  TEAMLEADER: ROLES.TEAM_LEADER,
  TEAM_LEADER: ROLES.TEAM_LEADER,
  TEAMLEAD: ROLES.TEAM_LEADER,
  MEMBER: ROLES.MEMBER,
});

export const DASHBOARD_ROOT_BY_ROLE = Object.freeze({
  [ROLES.SUPER_ADMIN]: "/super-admin",
  [ROLES.ORG_ADMIN]: "/org",
  [ROLES.SUB_ADMIN]: "/org",
  [ROLES.TEAM_LEADER]: "/team-leader",
  [ROLES.MEMBER]: "/member",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.ORG_ADMIN]: "Admin",
  [ROLES.SUB_ADMIN]: "Sub Admin",
  [ROLES.TEAM_LEADER]: "Team Leader",
  [ROLES.MEMBER]: "Member",
});

export const LOGIN_ROLE_OPTIONS = Object.freeze([
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN] },
  { value: ROLES.ORG_ADMIN, label: ROLE_LABELS[ROLES.ORG_ADMIN] },
  { value: ROLES.SUB_ADMIN, label: ROLE_LABELS[ROLES.SUB_ADMIN] },
  { value: ROLES.TEAM_LEADER, label: ROLE_LABELS[ROLES.TEAM_LEADER] },
  { value: ROLES.MEMBER, label: ROLE_LABELS[ROLES.MEMBER] },
]);

export const ORG_MANAGED_ROLE_OPTIONS = Object.freeze([
  { value: ROLES.MEMBER, label: ROLE_LABELS[ROLES.MEMBER] },
  { value: ROLES.TEAM_LEADER, label: ROLE_LABELS[ROLES.TEAM_LEADER] },
  { value: ROLES.SUB_ADMIN, label: ROLE_LABELS[ROLES.SUB_ADMIN] },
]);

export const PERMISSIONS = Object.freeze({
  TEAM_VIEW: "TEAM_VIEW",
  TEAM_CREATE: "TEAM_CREATE",
  TEAM_UPDATE: "TEAM_UPDATE",
  TEAM_DELETE: "TEAM_DELETE",
  TEAM_ASSIGN_MEMBERS: "TEAM_ASSIGN_MEMBERS",
  ATTENDANCE_VIEW: "ATTENDANCE_VIEW",
  ATTENDANCE_MANAGE: "ATTENDANCE_MANAGE",
  REPORTS_VIEW: "REPORTS_VIEW",
  USERS_CREATE: "USERS_CREATE",
  USERS_STATUS_UPDATE: "USERS_STATUS_UPDATE",
  USERS_ACTIVE_TOGGLE: "USERS_ACTIVE_TOGGLE",
  USERS_DELETE: "USERS_DELETE",
  SUBSCRIPTION_VIEW: "SUBSCRIPTION_VIEW",
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.TEAM_VIEW]: "View Teams",
  [PERMISSIONS.TEAM_CREATE]: "Create Teams",
  [PERMISSIONS.TEAM_UPDATE]: "Update Teams",
  [PERMISSIONS.TEAM_DELETE]: "Delete Teams",
  [PERMISSIONS.TEAM_ASSIGN_MEMBERS]: "Assign Team Members",
  [PERMISSIONS.ATTENDANCE_VIEW]: "View Attendance",
  [PERMISSIONS.ATTENDANCE_MANAGE]: "Manage Attendance",
  [PERMISSIONS.REPORTS_VIEW]: "View Reports",
  [PERMISSIONS.USERS_CREATE]: "Create Users",
  [PERMISSIONS.USERS_STATUS_UPDATE]: "Approve/Reject Users",
  [PERMISSIONS.USERS_ACTIVE_TOGGLE]: "Activate/Deactivate Users",
  [PERMISSIONS.USERS_DELETE]: "Delete Users",
  [PERMISSIONS.SUBSCRIPTION_VIEW]: "View Subscription",
});

export const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ORG_ADMIN]: ALL_PERMISSIONS,
  [ROLES.SUB_ADMIN]: Object.freeze([
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.ATTENDANCE_MANAGE,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_STATUS_UPDATE,
    PERMISSIONS.USERS_ACTIVE_TOGGLE,
  ]),
  [ROLES.TEAM_LEADER]: Object.freeze([
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ]),
  [ROLES.MEMBER]: Object.freeze([PERMISSIONS.ATTENDANCE_VIEW]),
});

export const PERMISSION_GROUPS = Object.freeze([
  {
    key: "TEAM",
    label: "Team Management",
    items: [
      PERMISSIONS.TEAM_VIEW,
      PERMISSIONS.TEAM_CREATE,
      PERMISSIONS.TEAM_UPDATE,
      PERMISSIONS.TEAM_DELETE,
      PERMISSIONS.TEAM_ASSIGN_MEMBERS,
    ],
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    items: [
      PERMISSIONS.ATTENDANCE_VIEW,
      PERMISSIONS.ATTENDANCE_MANAGE,
    ],
  },
  {
    key: "REPORTS",
    label: "Reports",
    items: [PERMISSIONS.REPORTS_VIEW],
  },
  {
    key: "USERS",
    label: "User Management",
    items: [
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_STATUS_UPDATE,
      PERMISSIONS.USERS_ACTIVE_TOGGLE,
      PERMISSIONS.USERS_DELETE,
    ],
  },
  {
    key: "SUBSCRIPTION",
    label: "Subscription",
    items: [PERMISSIONS.SUBSCRIPTION_VIEW],
  },
]);

export const ASSIGNABLE_PERMISSIONS_BY_ROLE = Object.freeze({
  [ROLES.ORG_ADMIN]: ALL_PERMISSIONS,
  [ROLES.SUB_ADMIN]: Object.freeze([
    PERMISSIONS.TEAM_VIEW,
    PERMISSIONS.ATTENDANCE_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ]),
  [ROLES.TEAM_LEADER]: Object.freeze([]),
  [ROLES.MEMBER]: Object.freeze([]),
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
});

export const normalizeRole = (role) => {
  if (!role) return ROLES.MEMBER;
  const rawRole = String(role).toUpperCase().trim();
  const normalizedWithUnderscore = rawRole.replace(/[\s-]+/g, "_");
  const compact = normalizedWithUnderscore.replace(/_/g, "");

  return (
    ROLE_ALIASES[rawRole] ||
    ROLE_ALIASES[normalizedWithUnderscore] ||
    ROLE_ALIASES[compact] ||
    ROLES.MEMBER
  );
};

export const normalizePermission = (permission) => {
  if (!permission) return null;
  const normalized = String(permission).toUpperCase().trim().replace(/[\s-]+/g, "_");
  return ALL_PERMISSIONS.includes(normalized) ? normalized : null;
};

export const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
};

export const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [])];
};

export const getAssignablePermissionsByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ASSIGNABLE_PERMISSIONS_BY_ROLE[normalizedRole] || [])];
};

export const resolveUserPermissions = (userOrRole, explicitPermissions) => {
  if (!userOrRole && !explicitPermissions) return [];

  const role = typeof userOrRole === "string"
    ? normalizeRole(userOrRole)
    : normalizeRole(userOrRole?.role);

  if (role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN) {
    return [...ALL_PERMISSIONS];
  }

  const sourcePermissions = explicitPermissions !== undefined
    ? explicitPermissions
    : userOrRole?.permissions;

  const normalizedPermissions = normalizePermissionList(sourcePermissions);
  if (normalizedPermissions.length > 0) {
    return normalizedPermissions;
  }

  return getDefaultPermissionsForRole(role);
};

export const getDashboardPathByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  const root = DASHBOARD_ROOT_BY_ROLE[normalizedRole] || DASHBOARD_ROOT_BY_ROLE[ROLES.MEMBER];
  return `${root}/dashboard`;
};

export const getDashboardRootByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return DASHBOARD_ROOT_BY_ROLE[normalizedRole] || DASHBOARD_ROOT_BY_ROLE[ROLES.MEMBER];
};

export const resolveDashboardPath = (role, dashboardPath) => {
  if (!role && !dashboardPath) return null;

  const fallbackPath = getDashboardPathByRole(role);
  if (!dashboardPath) return fallbackPath;

  const normalizedPath = String(dashboardPath).trim();
  if (!normalizedPath.startsWith("/")) return fallbackPath;

  const expectedRoot = getDashboardRootByRole(role);
  return normalizedPath === expectedRoot || normalizedPath.startsWith(`${expectedRoot}/`)
    ? normalizedPath
    : fallbackPath;
};

const humanizeIdentifier = (value) =>
  String(value || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (token) => token.toUpperCase());

export const formatRoleLabel = (role) => {
  const normalizedRole = normalizeRole(role);
  return ROLE_LABELS[normalizedRole] || humanizeIdentifier(role) || ROLE_LABELS[ROLES.MEMBER];
};

const DASHBOARD_HEADER_BADGE_THEME =
  "border-violet-200 bg-violet-50 text-slate-950 dark:border-violet-300/35 dark:bg-gradient-to-r dark:from-violet-500/90 dark:via-fuchsia-500/80 dark:to-indigo-500/90 dark:text-white dark:shadow-[0_12px_28px_rgba(124,58,237,0.24)]";

export const getRoleBadgeTheme = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.SUPER_ADMIN:
      return {
        sidebar:
          "border border-blue-400/20 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.30)] dark:border-blue-400/20 dark:from-blue-500 dark:via-indigo-500 dark:to-cyan-400 dark:text-white",
        header: DASHBOARD_HEADER_BADGE_THEME,
        accent:
          "bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-[0_18px_42px_rgba(59,130,246,0.22)] dark:from-blue-500 dark:to-cyan-400 dark:text-white",
      };
    case ROLES.ORG_ADMIN:
      return {
        sidebar:
          "border border-blue-400/20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(59,130,246,0.28)] dark:border-blue-400/20 dark:bg-blue-400 dark:text-slate-950",
        header: DASHBOARD_HEADER_BADGE_THEME,
        accent:
          "bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(59,130,246,0.22)] dark:from-blue-500 dark:to-indigo-400 dark:text-white",
      };
    case ROLES.SUB_ADMIN:
      return {
        sidebar:
          "border border-violet-400/20 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.28)] dark:border-violet-400/20 dark:from-violet-500 dark:to-indigo-500 dark:text-white",
        header: DASHBOARD_HEADER_BADGE_THEME,
        accent:
          "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_18px_42px_rgba(124,58,237,0.22)] dark:from-violet-500 dark:to-indigo-400 dark:text-white",
      };
    case ROLES.TEAM_LEADER:
      return {
        sidebar:
          "border border-emerald-400/20 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_18px_42px_rgba(16,185,129,0.26)] dark:border-emerald-400/20 dark:from-emerald-500 dark:to-teal-400 dark:text-white",
        header: DASHBOARD_HEADER_BADGE_THEME,
        accent:
          "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_18px_42px_rgba(16,185,129,0.22)] dark:from-emerald-500 dark:to-teal-400 dark:text-white",
      };
    case ROLES.MEMBER:
    default:
      return {
        sidebar:
          "border border-amber-400/20 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-[0_18px_42px_rgba(245,158,11,0.28)] dark:border-amber-400/20 dark:from-amber-500 dark:to-orange-400 dark:text-white",
        header: DASHBOARD_HEADER_BADGE_THEME,
        accent:
          "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_18px_42px_rgba(245,158,11,0.22)] dark:from-amber-500 dark:to-orange-400 dark:text-white",
      };
  }
};

export const formatPermissionLabel = (permission) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return "Unknown Permission";
  return PERMISSION_LABELS[normalizedPermission] || humanizeIdentifier(permission);
};

export const hasPermission = (userOrRole, permissionKey, explicitPermissions) => {
  const normalizedPermission = normalizePermission(permissionKey);
  if (!normalizedPermission) return false;

  const resolvedPermissions = resolveUserPermissions(userOrRole, explicitPermissions);
  return resolvedPermissions.includes(normalizedPermission);
};
