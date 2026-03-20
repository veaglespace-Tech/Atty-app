const { normalizeRole } = require("../constants/rbac");
const { resolveUserPermissions } = require("../constants/permissions");
const { parsePermissions } = require("../utils/identity");
const { toSummaryItem } = require("./common.service");

const mapUserForManagement = (user) => {
  const explicitPermissions = parsePermissions(user.permissions);
  const resolvedPermissions = resolveUserPermissions({
    role: user.role,
    permissions: explicitPermissions,
  });

  return {
    id: user.id,
    _id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    mobileCountryCode: user.mobileCountryCode || null,
    role: normalizeRole(user.role),
    permissions: resolvedPermissions,
    approvalStatus: user.status,
    active: Boolean(user.isActive),
    joinedAt: user.createdAt,
    createdAt: user.createdAt,
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
