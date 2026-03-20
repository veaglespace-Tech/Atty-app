const { normalizeRole } = require("../constants/rbac");
const {
  hasPermission,
  normalizePermissionList,
  resolveUserPermissions,
} = require("../constants/permissions");

const assertPermission = (res, user, permissionKey) => {
  if (!hasPermission(user, permissionKey)) {
    res.status(403);
    throw new Error("Missing required permission");
  }
};

const assertRoleScope = (res, actor, targetRole) => {
  const actorRole = normalizeRole(actor?.role);
  const normalizedTargetRole = normalizeRole(targetRole);

  if (actorRole === "SUPER_ADMIN" || actorRole === "ORG_ADMIN") {
    return;
  }

  if (actorRole === "SUB_ADMIN") {
    if (normalizedTargetRole !== "MEMBER") {
      res.status(403);
      throw new Error("Sub admin can only manage member accounts");
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

const sanitizePermissionsByAssigner = (actor, explicitPermissions, fallbackRolePermissions) => {
  const actorRole = normalizeRole(actor?.role);
  const normalizedExplicit = normalizePermissionList(explicitPermissions);
  if (actorRole === "SUPER_ADMIN" || actorRole === "ORG_ADMIN") {
    return normalizedExplicit.length > 0
      ? normalizedExplicit
      : [...fallbackRolePermissions];
  }

  if (actorRole === "SUB_ADMIN") {
    const actorPermissions = new Set(resolveUserPermissions(actor));
    const bounded = normalizedExplicit.filter((permission) =>
      actorPermissions.has(permission)
    );
    return bounded.length > 0 ? bounded : [...fallbackRolePermissions].filter((permission) => actorPermissions.has(permission));
  }

  return [...fallbackRolePermissions];
};

module.exports = {
  assertPermission,
  assertRoleScope,
  sanitizePermissionsByAssigner,
};

