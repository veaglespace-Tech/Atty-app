const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { resolveUserRole } = require("../utils/membership");

exports.checkOrgStatus = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    res.status(403);
    throw new Error("User context missing");
  }

  const role = resolveUserRole(req.user);

  if (role === "SUPER_ADMIN") {
    const organizationId = req.user.organizationId || req.user.organization;
    if (organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: Number(organizationId) },
      });
      req.organization = org;
    }
    return next();
  }

  const organizationId = req.user.organizationId || req.user.organization;

  if (!organizationId) {
    res.status(403);
    throw new Error("Organization context missing");
  }

  const org = await prisma.organization.findUnique({
    where: { id: Number(organizationId) },
  });

  if (!org) {
    res.status(404);
    throw new Error("Organization not found");
  }

  if (org.isBlocked || org.isActive === false) {
    res.status(403);
    throw new Error("Your organization is blocked. Please contact support.");
  }

  if (org.deletedAt) {
    res.status(410);
    throw new Error("Organization no longer exists.");
  }

  const now = new Date();
  if (org.subscriptionExpiry && now > org.subscriptionExpiry && org.subscriptionStatus !== "EXPIRED") {
    await prisma.organization.update({
      where: { id: org.id },
      data: { subscriptionStatus: "EXPIRED" },
    });
    org.subscriptionStatus = "EXPIRED";
  }

  if (org.subscriptionStatus === "EXPIRED") {
    res.status(402);
    throw new Error("Subscription expired. Please renew to continue.");
  }

  req.organization = org;
  next();
});
