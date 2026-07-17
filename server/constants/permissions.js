const { normalizeRole } = require("./rbac");
const { resolveUserRole } = require("../utils/membership");

const PERMISSIONS = Object.freeze({
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

// Helper to flatten the object into an array
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

const ALL_PERMISSIONS = Object.freeze(extractPermissions(PERMISSIONS));

const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: ALL_PERMISSIONS,
  ORG_ADMIN: ALL_PERMISSIONS,
  SUB_ADMIN: Object.freeze([
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
  TEAM_LEADER: Object.freeze([
    PERMISSIONS.TEAM.VIEW_OWN,
    PERMISSIONS.TEAM.CREATE,
    PERMISSIONS.TEAM.UPDATE,
    PERMISSIONS.TEAM.ASSIGN_MEMBERS,
    PERMISSIONS.ATTENDANCE.VIEW_TEAM,
    PERMISSIONS.ATTENDANCE.MANAGE,
    PERMISSIONS.REPORTS.VIEW,
    PERMISSIONS.REPORTS.DOWNLOAD,
    PERMISSIONS.USERS.VIEW,
    PERMISSIONS.POSTS.VIEW,
    PERMISSIONS.POSTS.CREATE,
    PERMISSIONS.SUBSCRIPTION.VIEW,
    PERMISSIONS.LOCATION.VIEW,
    PERMISSIONS.LOCATION.MANAGE
  ]),
  MEMBER: Object.freeze([
    PERMISSIONS.ATTENDANCE.VIEW_OWN,
    PERMISSIONS.POSTS.VIEW
  ]),
  LIFE_MEMBER: Object.freeze([
    PERMISSIONS.ATTENDANCE.VIEW_OWN,
    PERMISSIONS.POSTS.VIEW
  ]),
});

const ASSIGNABLE_PERMISSIONS_BY_ROLE = Object.freeze({
  ORG_ADMIN: ALL_PERMISSIONS,
  SUB_ADMIN: ALL_PERMISSIONS,
  TEAM_LEADER: ALL_PERMISSIONS,
  MEMBER: ALL_PERMISSIONS,
  SUPER_ADMIN: ALL_PERMISSIONS,
});

const normalizePermission = (permission) => {
  if (!permission) return null;
  const normalized = String(permission).toLowerCase().trim();
  // Allow a-z, 0-9, underscores, and colons
  return /^[a-z0-9_:]+$/.test(normalized) ? normalized : null;
};

const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
};

// Dynamic role permissions cache populated from the DB
const rolePermissionsCache = new Map();

const updateRolePermissionsCache = (role, permissions) => {
  rolePermissionsCache.set(role, permissions);
};

const getRolePermissionsCache = () => rolePermissionsCache;

const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  if (rolePermissionsCache.has(normalizedRole)) {
    return rolePermissionsCache.get(normalizedRole);
  }
  return [...(ROLE_DEFAULT_PERMISSIONS[normalizedRole] || ROLE_DEFAULT_PERMISSIONS["MEMBER"])];
};

const getAssignablePermissionsByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ASSIGNABLE_PERMISSIONS_BY_ROLE[normalizedRole] || ALL_PERMISSIONS)];
};

const resolveUserPermissions = (userOrRole, orgIdOrPermissions = null) => {
  const explicitPermissions = Array.isArray(orgIdOrPermissions) ? orgIdOrPermissions : undefined;
  const explicitOrgId = explicitPermissions ? null : orgIdOrPermissions;

  if (!userOrRole && !explicitPermissions) return [];

  const normalizedRole =
    typeof userOrRole === "string" ? normalizeRole(userOrRole) : resolveUserRole(userOrRole, explicitOrgId);

  if (!normalizedRole) {
    return [];
  }

  if (normalizedRole === "SUPER_ADMIN" || normalizedRole === "ORG_ADMIN") {
    return [...ALL_PERMISSIONS];
  }

  const hasStoredPermissions =
    explicitPermissions !== undefined || Array.isArray(userOrRole?.permissions);
  const sourcePermissions =
    explicitPermissions !== undefined ? explicitPermissions : userOrRole?.permissions;
  const normalizedPermissions = normalizePermissionList(sourcePermissions);

  if (hasStoredPermissions) {
    return normalizedPermissions;
  }

  return getDefaultPermissionsForRole(normalizedRole);
};

const hasPermission = (user, permission, orgId = null) => {
  const normalizedPermission = normalizePermission(permission);
  if (!normalizedPermission) return false;

  const resolvedPermissions = resolveUserPermissions(user, orgId);
  if (resolvedPermissions.includes(normalizedPermission)) return true;

  return resolvedPermissions.some((p) => {
    if (p.endsWith("*")) {
      const prefix = p.slice(0, -1);
      return normalizedPermission.startsWith(prefix);
    }
    return false;
  });
};

module.exports = {
  PERMISSIONS,
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ASSIGNABLE_PERMISSIONS_BY_ROLE,
  normalizePermission,
  normalizePermissionList,
  getDefaultPermissionsForRole,
  getAssignablePermissionsByRole,
  resolveUserPermissions,
  hasPermission,
  updateRolePermissionsCache,
  getRolePermissionsCache,
};
