const { normalizeRole } = require("../constants/rbac");
const { resolveUserPermissions } = require("../constants/permissions");
const { resolveUserRole } = require("../utils/membership");
const { toSummaryItem } = require("./common.service");

const mapUserForManagement = (user, orgId = null) => {
  const resolvedRole = resolveUserRole(user, orgId);
  const resolvedPermissions = resolveUserPermissions(user, orgId);

  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    mobileCountryCode: user.mobileCountryCode || null,
    profileImageUrl: user.profileImageUrl || null,
    role: normalizeRole(resolvedRole),
    permissions: resolvedPermissions,
    approvalStatus: user.status,
    active: Boolean(user.isActive),
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
  mapUserForManagement,
  buildUserSummary,
};
