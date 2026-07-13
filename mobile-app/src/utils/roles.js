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
  { value: ROLES.ORG_ADMIN, label: ROLE_LABELS[ROLES.ORG_ADMIN] },
]);

export const PERMISSIONS = Object.freeze({
  TEAM: {
    VIEW_ALL: "team:view:all",
    VIEW_OWN: "team:view:own",
    CREATE: "team:create",
    UPDATE: "team:update",
    DELETE: "team:delete",
    ASSIGN_MEMBERS: "team:assign_members",
  },
  ATTENDANCE: {
    VIEW_ALL: "attendance:view:all",
    VIEW_TEAM: "attendance:view:team",
    VIEW_OWN: "attendance:view:own",
    MANAGE: "attendance:manage",
  },
  REPORTS: {
    VIEW: "reports:view",
    DOWNLOAD: "reports:download",
  },
  USERS: {
    VIEW: "users:view",
    CREATE: "users:create",
    UPDATE_STATUS: "users:update_status",
    TOGGLE_ACTIVE: "users:toggle_active",
    DELETE: "users:delete",
  },
  POSTS: {
    VIEW: "posts:view",
    CREATE: "posts:create",
    UPDATE: "posts:update",
    DELETE: "posts:delete",
  },
  SUBSCRIPTION: {
    VIEW: "subscription:view",
    MANAGE: "subscription:manage",
  },
  LOCATION: {
    VIEW: "location:view",
    MANAGE: "location:manage",
  },
  ROLES: {
    VIEW: "roles:view",
    MANAGE: "roles:manage",
  }
});

const extractPermissions = (obj) => {
  let perms = [];
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      perms.push(obj[key]);
    } else {
      perms.push(...extractPermissions(obj[key]));
    }
  }
  return perms;
};

export const ALL_PERMISSIONS = Object.freeze(extractPermissions(PERMISSIONS));

export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.TEAM.VIEW_ALL]: "View All Teams",
  [PERMISSIONS.TEAM.VIEW_OWN]: "View Own Teams",
  [PERMISSIONS.TEAM.CREATE]: "Create Teams",
  [PERMISSIONS.TEAM.UPDATE]: "Update Teams",
  [PERMISSIONS.TEAM.DELETE]: "Delete Teams",
  [PERMISSIONS.TEAM.ASSIGN_MEMBERS]: "Assign Team Members",
  [PERMISSIONS.ATTENDANCE.VIEW_ALL]: "View All Attendance",
  [PERMISSIONS.ATTENDANCE.VIEW_TEAM]: "View Team Attendance",
  [PERMISSIONS.ATTENDANCE.VIEW_OWN]: "View Own Attendance",
  [PERMISSIONS.ATTENDANCE.MANAGE]: "Manage Attendance",
  [PERMISSIONS.REPORTS.VIEW]: "View Reports",
  [PERMISSIONS.REPORTS.DOWNLOAD]: "Download Reports",
  [PERMISSIONS.USERS.VIEW]: "View Users",
  [PERMISSIONS.USERS.CREATE]: "Create Users",
  [PERMISSIONS.USERS.UPDATE_STATUS]: "Approve/Reject Users",
  [PERMISSIONS.USERS.TOGGLE_ACTIVE]: "Activate/Deactivate Users",
  [PERMISSIONS.USERS.DELETE]: "Delete Users",
  [PERMISSIONS.SUBSCRIPTION.VIEW]: "View Subscription",
  [PERMISSIONS.SUBSCRIPTION.MANAGE]: "Manage Subscription",
  [PERMISSIONS.LOCATION.VIEW]: "View Location",
  [PERMISSIONS.LOCATION.MANAGE]: "Manage Location",
  [PERMISSIONS.POSTS.VIEW]: "View Posts",
  [PERMISSIONS.POSTS.CREATE]: "Create Posts",
  [PERMISSIONS.POSTS.UPDATE]: "Update Posts",
  [PERMISSIONS.POSTS.DELETE]: "Delete Posts",
  [PERMISSIONS.ROLES.VIEW]: "View Roles",
  [PERMISSIONS.ROLES.MANAGE]: "Manage Roles",
});

export const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
  [ROLES.ORG_ADMIN]: ALL_PERMISSIONS,
  [ROLES.SUB_ADMIN]: Object.freeze([
    PERMISSIONS.TEAM.VIEW_ALL,
    PERMISSIONS.TEAM.CREATE,
    PERMISSIONS.TEAM.UPDATE,
    PERMISSIONS.TEAM.ASSIGN_MEMBERS,
    PERMISSIONS.ATTENDANCE.VIEW_ALL,
    PERMISSIONS.ATTENDANCE.MANAGE,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.USERS.CREATE,
    PERMISSIONS.USERS.UPDATE_STATUS,
    PERMISSIONS.USERS.TOGGLE_ACTIVE,
    PERMISSIONS.POSTS.VIEW,
    PERMISSIONS.POSTS.CREATE,
    PERMISSIONS.POSTS.UPDATE,
    PERMISSIONS.SUBSCRIPTION.VIEW,
    PERMISSIONS.LOCATION.VIEW,
    PERMISSIONS.LOCATION.MANAGE,
    PERMISSIONS.ROLES.VIEW,
  ]),
  [ROLES.TEAM_LEADER]: Object.freeze([
    PERMISSIONS.TEAM.VIEW_OWN,
    PERMISSIONS.ATTENDANCE.VIEW_TEAM,
    PERMISSIONS.ATTENDANCE.MANAGE,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.POSTS.VIEW,
    PERMISSIONS.POSTS.CREATE,
    PERMISSIONS.SUBSCRIPTION.VIEW,
    PERMISSIONS.LOCATION.VIEW
  ]),
  [ROLES.MEMBER]: Object.freeze([
    PERMISSIONS.ATTENDANCE.VIEW_OWN,
    PERMISSIONS.POSTS.VIEW
  ]),
});

export const PERMISSION_GROUPS = Object.freeze([
  {
    key: "TEAM",
    label: "Team Management",
    items: [
      PERMISSIONS.TEAM.VIEW_ALL,
      PERMISSIONS.TEAM.VIEW_OWN,
      PERMISSIONS.TEAM.CREATE,
      PERMISSIONS.TEAM.UPDATE,
      PERMISSIONS.TEAM.DELETE,
      PERMISSIONS.TEAM.ASSIGN_MEMBERS,
    ],
  },
  {
    key: "ATTENDANCE",
    label: "Attendance",
    items: [
      PERMISSIONS.ATTENDANCE.VIEW_ALL,
      PERMISSIONS.ATTENDANCE.VIEW_TEAM,
      PERMISSIONS.ATTENDANCE.VIEW_OWN,
      PERMISSIONS.ATTENDANCE.MANAGE,
    ],
  },
  {
    key: "REPORTS",
    label: "Reports",
    items: [PERMISSIONS.REPORTS.VIEW, PERMISSIONS.REPORTS.DOWNLOAD],
  },
  {
    key: "USERS",
    label: "User Management",
    items: [
      PERMISSIONS.USERS.VIEW,
      PERMISSIONS.USERS.CREATE,
      PERMISSIONS.USERS.UPDATE_STATUS,
      PERMISSIONS.USERS.TOGGLE_ACTIVE,
      PERMISSIONS.USERS.DELETE,
    ],
  },
  {
    key: "SUBSCRIPTION",
    label: "Subscription",
    items: [PERMISSIONS.SUBSCRIPTION.VIEW, PERMISSIONS.SUBSCRIPTION.MANAGE],
  },
  {
    key: "CONFIGURATION",
    label: "Configuration",
    items: [PERMISSIONS.LOCATION.VIEW, PERMISSIONS.LOCATION.MANAGE, PERMISSIONS.ROLES.VIEW, PERMISSIONS.ROLES.MANAGE],
  },
  {
    key: "COMMUNICATION",
    label: "Communication",
    items: [PERMISSIONS.POSTS.VIEW, PERMISSIONS.POSTS.CREATE, PERMISSIONS.POSTS.UPDATE, PERMISSIONS.POSTS.DELETE],
  },
]);

export const ASSIGNABLE_PERMISSIONS_BY_ROLE = Object.freeze({
  [ROLES.ORG_ADMIN]: ALL_PERMISSIONS,
  [ROLES.SUB_ADMIN]: ALL_PERMISSIONS,
  [ROLES.TEAM_LEADER]: ALL_PERMISSIONS,
  [ROLES.MEMBER]: ALL_PERMISSIONS,
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
    normalizedWithUnderscore
  );
};

export const normalizePermission = (permission) => {
  if (!permission) return null;
  const normalized = String(permission).toLowerCase().trim();
  return ALL_PERMISSIONS.includes(normalized) ? normalized : null;
};

export const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
};

export const parseOrganizationId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

export const normalizeMembership = (membership) => {
  if (!membership || typeof membership !== "object") return null;

  const orgId = parseOrganizationId(membership.orgId);
  if (!orgId) return null;

  return {
    ...membership,
    orgId,
    role: normalizeRole(membership.role),
    isActive: membership.isActive !== false,
  };
};

export const normalizeMemberships = (memberships = []) =>
  (Array.isArray(memberships) ? memberships : [])
    .map(normalizeMembership)
    .filter(Boolean);

export const getUserOrganizationId = (user, fallback = null) => {
  const directOrganization =
    user?.organization && typeof user.organization === "object"
      ? user.organization.id
      : user?.organization;

  return (
    parseOrganizationId(user?.organizationId) ||
    parseOrganizationId(user?.orgId) ||
    parseOrganizationId(user?.currentMembership?.orgId) ||
    parseOrganizationId(directOrganization) ||
    parseOrganizationId(fallback)
  );
};

export const getMembershipForOrg = (user, orgId = null) => {
  const memberships = normalizeMemberships(user?.memberships);
  const targetOrgId = getUserOrganizationId(user, orgId);
  const currentMembership = normalizeMembership(user?.currentMembership);

  if (!targetOrgId) {
    return currentMembership;
  }

  return (
    memberships.find((membership) => membership.orgId === targetOrgId) ||
    (currentMembership?.orgId === targetOrgId ? currentMembership : null)
  );
};

export const getAccessibleRoles = (user, orgId = null) => {
  if (!user) return [];
  if (typeof user === "string") return [normalizeRole(user)];

  const currentMembership = normalizeMembership(user?.currentMembership);
  const targetOrgId = getUserOrganizationId(user, orgId);

  if (targetOrgId) {
    const membership = getMembershipForOrg(user, targetOrgId);
    if (!membership || membership.isActive === false) return [];
    return [membership.role];
  }

  if (currentMembership?.isActive !== false && currentMembership?.role) {
    return [currentMembership.role];
  }

  const memberships = normalizeMemberships(user?.memberships);
  const activeRoles = memberships
    .filter((membership) => membership.isActive !== false)
    .map((membership) => membership.role);

  if (activeRoles.length > 0) {
    return activeRoles;
  }

  return user?.currentRole ? [normalizeRole(user.currentRole)] : [];
};

export const getUserRoleForOrg = (user, orgId = null) => {
  if (!user) return null;
  if (typeof user === "string") return normalizeRole(user);

  const roles = getAccessibleRoles(user, orgId);
  if (roles.includes(ROLES.SUPER_ADMIN)) {
    return ROLES.SUPER_ADMIN;
  }

  return roles[0] || null;
};

export const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [])];
};

export const getAssignablePermissionsByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ASSIGNABLE_PERMISSIONS_BY_ROLE[normalizedRole] || [])];
};

export const getManagedRoleOptions = (actorRole) => {
  const normalizedActorRole = normalizeRole(actorRole);

  if (normalizedActorRole === ROLES.ORG_ADMIN || normalizedActorRole === ROLES.SUPER_ADMIN) {
    return [...ORG_MANAGED_ROLE_OPTIONS];
  }

  if (normalizedActorRole === ROLES.SUB_ADMIN) {
    return ORG_MANAGED_ROLE_OPTIONS.filter(
      (option) =>
        option.value === ROLES.MEMBER ||
        option.value === ROLES.TEAM_LEADER
    );
  }

  return ORG_MANAGED_ROLE_OPTIONS.filter((option) => option.value === ROLES.MEMBER);
};

export const resolveUserPermissions = (userOrRole, orgIdOrPermissions) => {
  const explicitPermissions = Array.isArray(orgIdOrPermissions) ? orgIdOrPermissions : undefined;
  const explicitOrgId = explicitPermissions ? null : orgIdOrPermissions;

  if (!userOrRole && !explicitPermissions) return [];

  const role =
    typeof userOrRole === "string"
      ? normalizeRole(userOrRole)
      : getUserRoleForOrg(userOrRole, explicitOrgId);

  if (role === ROLES.SUPER_ADMIN || role === ROLES.ORG_ADMIN) {
    return [...ALL_PERMISSIONS];
  }

  const sourcePermissions =
    explicitPermissions !== undefined ? explicitPermissions : userOrRole?.permissions;
  const hasStoredPermissions =
    explicitPermissions !== undefined || Array.isArray(userOrRole?.permissions);
  const normalizedPermissions = normalizePermissionList(sourcePermissions);

  if (hasStoredPermissions) {
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

const STANDARD_ROLE_THEME = {
  sidebar:
    "border border-blue-200/70 bg-white/88 text-blue-700 shadow-[0_16px_36px_rgba(37,99,235,0.12)] dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200",
  header:
    "border-blue-200/80 bg-white/88 text-blue-700 shadow-[0_12px_28px_rgba(37,99,235,0.10)] dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-200",
  accent:
    "bg-gradient-to-br from-blue-600 to-slate-900 text-white shadow-[0_18px_40px_rgba(37,99,235,0.22)] dark:from-blue-500 dark:to-slate-900 dark:text-white",
};

export const getRoleBadgeTheme = (role) => {
  switch (normalizeRole(role)) {
    case ROLES.SUPER_ADMIN:
    case ROLES.ORG_ADMIN:
    case ROLES.SUB_ADMIN:
    case ROLES.TEAM_LEADER:
    case ROLES.MEMBER:
    default:
      return STANDARD_ROLE_THEME;
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
  if (resolvedPermissions.includes(normalizedPermission)) return true;

  return resolvedPermissions.some((p) => {
    if (p.endsWith("*")) {
      const prefix = p.slice(0, -1);
      return normalizedPermission.startsWith(prefix);
    }
    return false;
  });
};
