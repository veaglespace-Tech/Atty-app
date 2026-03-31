const prisma = require("../lib/prisma");

const findActiveSubscription = async ({ organizationId, now = new Date() }) => {
  const orgId = Number(organizationId);
  if (!Number.isFinite(orgId) || orgId <= 0) return null;

  const activeKey = `ORG_${orgId}`;

  return prisma.subscription.findFirst({
    where: {
      orgId,
      status: "ACTIVE",
      OR: [{ activeKey }, { activeKey: null }],
      endDate: {
        gte: now,
      },
    },
    orderBy: {
      endDate: "desc",
    },
  });
};

const expireOrganizationSubscriptions = async ({ organizationId, now = new Date() }) => {
  const orgId = Number(organizationId);
  if (!Number.isFinite(orgId) || orgId <= 0) {
    return null;
  }

  const [, organization] = await prisma.$transaction([
    prisma.subscription.updateMany({
      where: {
        orgId,
        status: "ACTIVE",
      },
      data: {
        status: "EXPIRED",
        activeKey: null,
      },
    }),
    prisma.organization.update({
      where: {
        id: orgId,
      },
      data: {
        subscriptionStatus: "EXPIRED",
        subscriptionId: null,
        subscriptionExpiry: now,
      },
    }),
  ]);

  return organization;
};

const syncOrganizationSubscriptionState = async ({ organizationId, organization = null, now = new Date() }) => {
  const orgId = Number(organizationId || organization?.id);
  if (!Number.isFinite(orgId) || orgId <= 0) {
    return {
      organization: null,
      activeSubscription: null,
      expired: true,
    };
  }

  let currentOrganization = organization;
  if (!currentOrganization) {
    currentOrganization = await prisma.organization.findUnique({
      where: { id: orgId },
    });
  }

  if (!currentOrganization) {
    return {
      organization: null,
      activeSubscription: null,
      expired: true,
    };
  }

  const activeSubscription = await findActiveSubscription({
    organizationId: orgId,
    now,
  });

  if (!activeSubscription) {
    const expiredOrganization = await expireOrganizationSubscriptions({
      organizationId: orgId,
      now,
    });

    return {
      organization: expiredOrganization,
      activeSubscription: null,
      expired: true,
    };
  }

  const [, , syncedOrganization] = await prisma.$transaction([
    prisma.subscription.updateMany({
      where: {
        orgId,
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
        activeKey: `ORG_${orgId}`,
      },
    }),
    prisma.organization.update({
      where: {
        id: orgId,
      },
      data: {
        planId: activeSubscription.planId || currentOrganization.planId || null,
        subscriptionStatus: "ACTIVE",
        subscriptionId: activeSubscription.id,
        subscriptionExpiry: activeSubscription.endDate,
      },
    }),
  ]);

  return {
    organization: syncedOrganization,
    activeSubscription,
    expired: false,
  };
};

module.exports = {
  expireOrganizationSubscriptions,
  findActiveSubscription,
  syncOrganizationSubscriptionState,
};
