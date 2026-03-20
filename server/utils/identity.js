const { normalizeRole } = require("../constants/rbac");
const { resolveUserPermissions, normalizePermissionList } = require("../constants/permissions");

const parsePermissions = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return normalizePermissionList(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return normalizePermissionList(parsed);
      }
    } catch (error) {
      return normalizePermissionList(
        value
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      );
    }
  }

  return [];
};

const normalizeUser = (user, organization = null) => {
  if (!user) return null;

  const normalizedRole = normalizeRole(user.role);
  const explicitPermissions = parsePermissions(user.permissions);
  const resolvedPermissions = resolveUserPermissions({
    role: normalizedRole,
    permissions: explicitPermissions,
  });

  const organizationId = user.orgId || user.organizationId || user.organization || null;

  return {
    ...user,
    role: normalizedRole,
    permissions: resolvedPermissions,
    organizationId,
    organization: organization || organizationId,
  };
};

module.exports = {
  parsePermissions,
  normalizeUser,
};