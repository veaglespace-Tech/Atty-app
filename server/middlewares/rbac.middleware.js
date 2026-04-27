const asyncHandler = require("express-async-handler");
const {
  ROLE_ROUTE_PREFIX,
  normalizeRole,
} = require("../constants/rbac");
const { resolveAccessibleRoles, resolveUserRole } = require("../utils/membership");

const isProtectionBypassed = () =>
  process.env.NODE_ENV === "test" &&
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

function sanitizePath(req) {
  return req.originalUrl.replace(/^\/api/, "") || "/";
}

const enforceRoleRouteAccess = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    return next();
  }

  const role = resolveUserRole(req.user);
  const path = sanitizePath(req);
  const allowedPrefix = ROLE_ROUTE_PREFIX[role];

  if (!allowedPrefix) {
    res.status(403);
    throw new Error("Invalid role for route access");
  }

  if (!path.startsWith(allowedPrefix)) {
    res.status(403);
    throw new Error("Unauthorized route access for this role");
  }

  next();
});

function allowRoles(...roles) {
  const normalizedAllowedRoles = roles.map((role) => normalizeRole(role));

  return asyncHandler(async (req, res, next) => {
    if (isProtectionBypassed()) {
      return next();
    }

    const accessibleRoles = resolveAccessibleRoles(req.user);

    if (!accessibleRoles.some((role) => normalizedAllowedRoles.includes(role))) {
      res.status(403);
      throw new Error("You do not have permission to access this resource");
    }

    next();
  });
}

module.exports = {
  enforceRoleRouteAccess,
  allowRoles,
};
