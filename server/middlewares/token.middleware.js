const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { normalizeUser } = require("../utils/identity");
const {
  resolveOrganizationId,
  resolveMembership,
  normalizeMemberships,
  resolveUserRole,
} = require("../utils/membership");

const isProtectionBypassed = () =>
  process.env.NODE_ENV === "test" &&
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

function extractToken(req) {
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    return req.headers.authorization.split(" ")[1];
  }

  return null;
}

const buildBypassUser = (req) => {
  const testOrganizationId = req.headers["x-test-org-id"]
    ? Number(req.headers["x-test-org-id"])
    : null;
  const testUserId = req.headers["x-test-user-id"]
    ? Number(req.headers["x-test-user-id"])
    : 1;
  const testRole = normalizeRole(req.headers["x-test-role"] || "SUPER_ADMIN");

  return {
    id: testUserId,
    _id: testUserId,
    name: "Bypass Test User",
    email: "bypass@test.local",
    organizationId: testOrganizationId,
    organization: testOrganizationId,
    memberships:
      testOrganizationId && testRole
        ? [
            {
              orgId: testOrganizationId,
              role: testRole,
              isActive: true,
            },
          ]
        : [],
    isActive: true,
    status: "APPROVED",
    deletedAt: null,
  };
};

const resolveAuthenticatedUser = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      include: {
        organization: true,
        memberships: true,
      },
    });

    if (!user) {
      throw createHttpError(401, "User not found");
    }

    if (user.deletedAt) {
      throw createHttpError(403, "Your account has been removed");
    }

    if (user.isActive === false) {
      throw createHttpError(403, "Your account is inactive");
    }

    if (user.status === "PENDING") {
      throw createHttpError(403, "Your registration is pending approval");
    }

    if (user.status === "REJECTED") {
      throw createHttpError(403, "Your registration request was rejected");
    }

    const normalizedUser = normalizeUser(user, user.organization || null);
    const organizationId = resolveOrganizationId(normalizedUser);

    if (organizationId) {
      const membership = resolveMembership(normalizedUser, organizationId);

      if (!membership) {
        throw createHttpError(403, "You do not belong to the selected organization");
      }

      if (membership.isActive === false) {
        throw createHttpError(403, "Your organization membership is inactive");
      }
    } else if (
      normalizeMemberships(normalizedUser.memberships).length === 0 &&
      resolveUserRole(normalizedUser) !== "SUPER_ADMIN"
    ) {
      throw createHttpError(403, "No active organization membership found");
    }

    return normalizedUser;
  } catch (error) {
    if (error?.statusCode) {
      throw error;
    }

    throw createHttpError(401, "Token is invalid or expired");
  }
};

const verifyToken = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    req.user = buildBypassUser(req);
    req.token = null;
    return next();
  }

  const token = extractToken(req);

  if (!token) {
    res.status(401);
    throw new Error("No token provided");
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
    req.token = token;
    next();
  } catch (error) {
    res.status(error?.statusCode || 401);
    throw error;
  }
});

const optionalToken = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    req.user = buildBypassUser(req);
    req.token = null;
    return next();
  }

  const token = extractToken(req);

  if (!token) {
    req.user = null;
    req.token = null;
    return next();
  }

  try {
    req.user = await resolveAuthenticatedUser(token);
    req.token = token;
  } catch (_) {
    req.user = null;
    req.token = null;
  }

  next();
});

module.exports = {
  extractToken,
  optionalToken,
  verifyToken,
};
