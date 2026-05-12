const { normalizeRole } = require("./rbac");
const { resolveUserRole } = require("../utils/membership");

const PERMISSION_KEYS = Object.freeze({
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
  LOCATION_SET: "LOCATION_SET",
  POST_CREATE: "POST_CREATE",
});

const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSION_KEYS));

const ROLE_DEFAULT_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: ALL_PERMISSIONS,
  ORG_ADMIN: ALL_PERMISSIONS,
  SUB_ADMIN: Object.freeze([
    PERMISSION_KEYS.TEAM_VIEW,
    PERMISSION_KEYS.ATTENDANCE_VIEW,
    PERMISSION_KEYS.ATTENDANCE_MANAGE,
    PERMISSION_KEYS.REPORTS_VIEW,
    PERMISSION_KEYS.USERS_CREATE,
    PERMISSION_KEYS.USERS_STATUS_UPDATE,
    PERMISSION_KEYS.USERS_ACTIVE_TOGGLE,
    PERMISSION_KEYS.LOCATION_SET,
    PERMISSION_KEYS.POST_CREATE,
  ]),
  TEAM_LEADER: Object.freeze([
    PERMISSION_KEYS.TEAM_VIEW,
    PERMISSION_KEYS.ATTENDANCE_VIEW,
    PERMISSION_KEYS.REPORTS_VIEW,
  ]),
  MEMBER: Object.freeze([PERMISSION_KEYS.ATTENDANCE_VIEW]),
});

const ASSIGNABLE_PERMISSIONS_BY_ROLE = Object.freeze({
  ORG_ADMIN: ALL_PERMISSIONS,
  SUB_ADMIN: Object.freeze([
    PERMISSION_KEYS.TEAM_VIEW,
    PERMISSION_KEYS.ATTENDANCE_VIEW,
    PERMISSION_KEYS.REPORTS_VIEW,
    PERMISSION_KEYS.LOCATION_SET,
    PERMISSION_KEYS.POST_CREATE,
  ]),
  TEAM_LEADER: Object.freeze([]),
  MEMBER: Object.freeze([]),
  SUPER_ADMIN: ALL_PERMISSIONS,
});

const normalizePermission = (permission) => {
  if (!permission) return null;
  const normalized = String(permission).toUpperCase().trim().replace(/[\s-]+/g, "_");
  // Allow if it's in the hardcoded list OR if it follows the pattern (for DB permissions)
  return /^[A-Z0-9_]+$/.test(normalized) ? normalized : null;
};

const normalizePermissionList = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.map(normalizePermission).filter(Boolean))];
};

const getDefaultPermissionsForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ROLE_DEFAULT_PERMISSIONS[normalizedRole] || [])];
};

const getAssignablePermissionsByRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return [...(ASSIGNABLE_PERMISSIONS_BY_ROLE[normalizedRole] || [])];
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
  return resolvedPermissions.includes(normalizedPermission);
};

module.exports = {
  PERMISSION_KEYS,
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ASSIGNABLE_PERMISSIONS_BY_ROLE,
  normalizePermission,
  normalizePermissionList,
  getDefaultPermissionsForRole,
  getAssignablePermissionsByRole,
  resolveUserPermissions,
  hasPermission,
};
