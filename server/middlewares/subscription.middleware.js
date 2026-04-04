const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { syncOrganizationSubscriptionState } = require("../services/subscription.service");
const { resolveUserRole } = require("../utils/membership");

const isProtectionBypassed = () =>
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

const checkActiveSubscription = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    return next();
  }

  const role = resolveUserRole(req.user);
  if (role === "SUPER_ADMIN") {
    return next();
  }

  const organizationId = req.user?.organizationId || req.user?.organization;
  if (!organizationId) {
    res.status(403);
    throw new Error("Organization context missing");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: Number(organizationId) },
  });

  if (!organization) {
    res.status(404);
    throw new Error("Organization not found");
  }

  if (organization.isBlocked || organization.isActive === false || organization.deletedAt) {
    res.status(403);
    throw new Error("Organization access is blocked");
  }

  const { organization: syncedOrganization, activeSubscription } =
    await syncOrganizationSubscriptionState({
      organizationId: Number(organizationId),
      organization,
      now: new Date(),
    });

  if (!activeSubscription) {
    res.status(402);
    throw new Error("Subscription expired. Please renew to continue.");
  }

  req.subscription = activeSubscription;
  req.organization = syncedOrganization || organization;
  next();
});

module.exports = {
  checkActiveSubscription,
};
