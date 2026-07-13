const { normalizeRole } = require("../constants/rbac");
const {
  ALL_PERMISSIONS,
  PERMISSIONS,
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
    permissionSet.has(PERMISSIONS.USERS.CREATE) ||
    permissionSet.has(PERMISSIONS.USERS.UPDATE_STATUS) ||
    permissionSet.has(PERMISSIONS.USERS.TOGGLE_ACTIVE) ||
    permissionSet.has(PERMISSIONS.USERS.DELETE) ||
    permissionSet.has(PERMISSIONS.SUBSCRIPTION.VIEW) ||
    permissionSet.has(PERMISSIONS.TEAM.CREATE) ||
    permissionSet.has(PERMISSIONS.TEAM.UPDATE) ||
    permissionSet.has(PERMISSIONS.TEAM.DELETE) ||
    permissionSet.has(PERMISSIONS.TEAM.ASSIGN_MEMBERS);

  if (hasAdminControls) {
    return "SUB_ADMIN";
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
