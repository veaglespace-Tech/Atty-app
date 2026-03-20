const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");

const isProtectionBypassed = () =>
  String(process.env.BYPASS_PROTECTED_ROUTES || "").toLowerCase() === "true";

const checkActiveSubscription = asyncHandler(async (req, res, next) => {
  if (isProtectionBypassed()) {
    return next();
  }

  const role = normalizeRole(req.user?.role);
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

  const now = new Date();
  const activeKey = `ORG_${organizationId}`;
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      orgId: Number(organizationId),
      status: "ACTIVE",
      OR: [
        { activeKey },
        { activeKey: null },
      ],
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      endDate: "desc",
    },
  });

  if (!activeSubscription) {
    await prisma.$transaction([
      prisma.subscription.updateMany({
        where: {
          orgId: Number(organizationId),
          status: "ACTIVE",
          endDate: {
            lt: now,
          },
        },
        data: {
          status: "EXPIRED",
          activeKey: null,
        },
      }),
      prisma.organization.update({
        where: {
          id: Number(organizationId),
        },
        data: {
          subscriptionStatus: "EXPIRED",
          subscriptionId: null,
        },
      }),
    ]);

    res.status(402);
    throw new Error("Subscription expired. Please renew to continue.");
  }

  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: {
        orgId: Number(organizationId),
        status: "ACTIVE",
        id: {
          not: activeSubscription.id,
        },
      },
      data: {
        status: "EXPIRED",
        activeKey: null,
      },
    }),
    prisma.subscription.update({
      where: {
        id: activeSubscription.id,
      },
      data: {
        activeKey,
      },
    }),
    prisma.organization.update({
      where: {
        id: Number(organizationId),
      },
      data: {
        subscriptionStatus: "ACTIVE",
        subscriptionId: activeSubscription.id,
        subscriptionExpiry: activeSubscription.endDate,
      },
    }),
  ]);

  req.subscription = activeSubscription;
  req.organization = organization;
  next();
});

module.exports = {
  checkActiveSubscription,
};
