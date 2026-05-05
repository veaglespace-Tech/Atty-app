const { normalizeRole } = require("../constants/rbac");
const {
  ALL_PERMISSIONS,
  PERMISSION_KEYS,
  ROLE_DEFAULT_PERMISSIONS,
  resolveUserPermissions,
} = require("../constants/permissions");
const { resolveUserRole } = require("../utils/membership");
const { toSummaryItem } = require("./common.service");

const inferManagedUserRole = (user, resolvedRole, resolvedPermissions = []) => {
  const normalizedResolvedRole = normalizeRole(resolvedRole);
  if (normalizedResolvedRole !== "MEMBER") {
    return normalizedResolvedRole;
  }

  const normalizedStoredRole = normalizeRole(user?.role);
  if (normalizedStoredRole !== "MEMBER") {
    return normalizedStoredRole;
  }

  const permissionSet = new Set(resolvedPermissions);
  const hasAllPermissions = ALL_PERMISSIONS.every((permission) => permissionSet.has(permission));
  if (hasAllPermissions) {
    return "ORG_ADMIN";
  }

  const hasAdminControls =
    permissionSet.has(PERMISSION_KEYS.USERS_CREATE) ||
    permissionSet.has(PERMISSION_KEYS.USERS_STATUS_UPDATE) ||
    permissionSet.has(PERMISSION_KEYS.USERS_ACTIVE_TOGGLE) ||
    permissionSet.has(PERMISSION_KEYS.USERS_DELETE) ||
    permissionSet.has(PERMISSION_KEYS.SUBSCRIPTION_VIEW) ||
    permissionSet.has(PERMISSION_KEYS.TEAM_CREATE) ||
    permissionSet.has(PERMISSION_KEYS.TEAM_UPDATE) ||
    permissionSet.has(PERMISSION_KEYS.TEAM_DELETE) ||
    permissionSet.has(PERMISSION_KEYS.TEAM_ASSIGN_MEMBERS);

  if (hasAdminControls) {
    return "SUB_ADMIN";
  }

  const teamLeaderDefaults = ROLE_DEFAULT_PERMISSIONS.TEAM_LEADER || [];
  const matchesTeamLeaderRole =
    teamLeaderDefaults.length > 0 &&
    teamLeaderDefaults.every((permission) => permissionSet.has(permission));

  if (matchesTeamLeaderRole) {
    return "TEAM_LEADER";
  }

  return "MEMBER";
};

const mapUserForManagement = (user, orgId = null) => {
  const resolvedRole = resolveUserRole(user, orgId);
  const resolvedPermissions = resolveUserPermissions(user, orgId);
  const displayRole = inferManagedUserRole(user, resolvedRole, resolvedPermissions);
  const membership = orgId
    ? (Array.isArray(user.memberships) ? user.memberships : []).find(
        (entry) => Number(entry?.orgId) === Number(orgId)
      )
    : null;
  const membershipActive =
    user.isActive !== false && (membership ? membership.isActive !== false : true);

  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    mobileCountryCode: user.mobileCountryCode || null,
    emergencyContact: user.emergencyContact || null,
    currentAddress: user.currentAddress || null,
    permanentAddress: user.permanentAddress || null,
    profileImageUrl: user.profileImageUrl || null,
    role: normalizeRole(displayRole),
    permissions: resolvedPermissions,
    approvalStatus: user.status,
    active: Boolean(membershipActive),
    joinedAt: user.createdAt,
    createdAt: user.createdAt,
    memberships: Array.isArray(user.memberships) ? user.memberships : [],
  };
};

const buildUserSummary = (users = []) => {
  const approved = users.filter((user) => user.approvalStatus === "APPROVED").length;
  const pending = users.filter((user) => user.approvalStatus === "PENDING").length;
  const active = users.filter((user) => user.active).length;

  return [
    toSummaryItem("Total Users", users.length),
    toSummaryItem("Approved", approved),
    toSummaryItem("Pending", pending),
    toSummaryItem("Active", active),
  ];
};

module.exports = {
  inferManagedUserRole,
  mapUserForManagement,
  buildUserSummary,
};
