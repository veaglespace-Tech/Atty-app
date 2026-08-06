const asyncHandler = require("express-async-handler");
const { resolveAccessibleRoles } = require("../utils/membership");
const { assertAnyPermission } = require("../services/access.service");

const isProtectionBypassed = () =>
  process.env.NODE_ENV === "test" &&
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

function requirePermission(...permissionKeys) {
  return asyncHandler(async (req, res, next) => {
    if (isProtectionBypassed()) {
      return next();
    }

    assertAnyPermission(res, req.user, permissionKeys);
    next();
  });
}

function requireMembership() {
  return asyncHandler(async (req, res, next) => {
    if (isProtectionBypassed()) {
      return next();
    }

    const accessibleRoles = resolveAccessibleRoles(req.user);
    const hasAccess = accessibleRoles.length > 0;

    if (!hasAccess) {
      res.status(403);
      throw new Error("You do not have permission to access this resource");
    }

    next();
  });
}

function requireSuperAdmin() {
  return asyncHandler(async (req, res, next) => {
    if (isProtectionBypassed()) {
      return next();
    }

    const { resolveUserRole } = require("../utils/membership");
    const role = resolveUserRole(req.user);

    if (role !== "SUPER_ADMIN") {
      res.status(403);
      throw new Error("You do not have permission to access this resource");
    }

    next();
  });
}

module.exports = {
  requirePermission,
  requireMembership,
  requireSuperAdmin,
};
