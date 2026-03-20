const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { resolveUserPermissions } = require("../constants/permissions");
const { normalizeUser } = require("../utils/identity");

const isProtectionBypassed = () =>
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

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

const verifyToken = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    const testOrganizationId = req.headers["x-test-org-id"] ? Number(req.headers["x-test-org-id"]) : null;
    const testUserId = req.headers["x-test-user-id"] ? Number(req.headers["x-test-user-id"]) : 1;
    const testRole = normalizeRole(req.headers["x-test-role"] || "SUPER_ADMIN");

    req.user = {
      id: testUserId,
      _id: testUserId,
      name: "Bypass Test User",
      email: "bypass@test.local",
      role: testRole,
      permissions: resolveUserPermissions(testRole),
      organizationId: testOrganizationId,
      organization: testOrganizationId,
      isActive: true,
      status: "APPROVED",
      deletedAt: null,
    };
    req.token = null;
    return next();
  }

  const token = extractToken(req);

  if (!token) {
    res.status(401);
    throw new Error("No token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    const user = await prisma.user.findUnique({
      where: { id: Number(decoded.id) },
      include: { organization: true },
    });

    if (!user) {
      res.status(401);
      throw new Error("User not found");
    }

    if (user.deletedAt) {
      res.status(403);
      throw new Error("Your account has been removed");
    }

    if (user.isActive === false) {
      res.status(403);
      throw new Error("Your account is inactive");
    }

    if (user.status === "PENDING") {
      res.status(403);
      throw new Error("Your registration is pending approval");
    }

    if (user.status === "REJECTED") {
      res.status(403);
      throw new Error("Your registration request was rejected");
    }

    req.user = normalizeUser(user, user.organization || null);
    req.token = token;
    next();
  } catch (error) {
    if (res.statusCode && res.statusCode !== 200) {
      throw error;
    }

    res.status(401);
    throw new Error("Token is invalid or expired");
  }
});

module.exports = {
  extractToken,
  verifyToken,
};