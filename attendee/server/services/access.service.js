const { normalizeRole } = require("../constants/rbac");
const {
  hasPermission,
  resolveUserPermissions,
} = require("../constants/permissions");
const { resolveUserRole } = require("../utils/membership");

const assertPermission = (res, user, permissionKey, orgId = null) => {
  if (!hasPermission(user, permissionKey, orgId)) {
    res.status(403);
    throw new Error("Missing required permission");
  }
};

const assertAnyPermission = (res, user, permissionKeys = [], orgId = null) => {
  const allowed = permissionKeys.some((permissionKey) =>
    hasPermission(user, permissionKey, orgId)
  );

  if (!allowed) {
    res.status(403);
    throw new Error("Missing required permission");
  }
};

const assertRoleScope = (res, actor, targetRole, orgId = null) => {
  const actorRole = resolveUserRole(actor, orgId);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (!actorRole) {
    res.status(403);
    throw new Error("Membership is required for this action");
  }

  if (actorRole === "SUPER_ADMIN" || actorRole === "ORG_ADMIN") {
    return;
  }

  if (actorRole === "SUB_ADMIN") {
    if (normalizedTargetRole !== "MEMBER" && normalizedTargetRole !== "TEAM_LEADER") {
      res.status(403);
      throw new Error("Sub admin can only manage members and team leaders");
    }
    return;
  }

  if (actorRole === "TEAM_LEADER") {
    if (normalizedTargetRole !== "MEMBER") {
      res.status(403);
      throw new Error("Team leader can only manage member accounts");
    }
    return;
  }

  res.status(403);
  throw new Error("Role is not allowed for this action");
};

const sanitizePermissionsByAssigner = (actor, fallbackRolePermissions, orgId = null) => {
  const actorRole = resolveUserRole(actor, orgId);
  if (actorRole === "SUPER_ADMIN" || actorRole === "ORG_ADMIN") {
    return [...fallbackRolePermissions];
  }

  if (actorRole === "SUB_ADMIN") {
    const actorPermissions = new Set(resolveUserPermissions(actor, orgId));
    return [...fallbackRolePermissions].filter((permission) => actorPermissions.has(permission));
  }

  return [...fallbackRolePermissions];
};

module.exports = {
  assertPermission,
  assertAnyPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
};

