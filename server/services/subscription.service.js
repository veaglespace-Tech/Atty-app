const prisma = require("../lib/prisma");

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const shiftUtcDays = (value, days) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + Number(days || 0) * DAY_IN_MS);
};

const parseSubscriptionDateInput = (value) => {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const raw = String(value).trim();
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error("Invalid subscription date");
    error.statusCode = 400;
    throw error;
  }

  return parsed;
};

const resolveManagedSubscriptionWindow = ({
  currentStartDate = null,
  currentEndDate = null,
  startDateInput,
  endDateInput,
  durationInDays = 0,
  forceEndDateRecalc = false,
}) => {
  const durationDays = Number(durationInDays || 0);
  const hasStartDateInput = startDateInput !== undefined;
  const hasEndDateInput = endDateInput !== undefined;

  let startDate = parseSubscriptionDateInput(startDateInput);
  let endDate = parseSubscriptionDateInput(endDateInput);

  if (startDate === undefined) {
    startDate = currentStartDate ? new Date(currentStartDate) : null;
  }
  if (endDate === undefined) {
    endDate = currentEndDate ? new Date(currentEndDate) : null;
  }

  const shouldRecalculateEndDate =
    durationDays > 0 &&
    startDate &&
    !hasEndDateInput &&
    (endDate === null || hasStartDateInput || forceEndDateRecalc);

  if (shouldRecalculateEndDate) {
    endDate = shiftUtcDays(startDate, durationDays);
  }

  if (!startDate && endDate && durationDays > 0) {
    startDate = shiftUtcDays(endDate, -durationDays);
  }

  if (startDate && endDate && endDate < startDate) {
    const error = new Error("Subscription end date cannot be before start date");
    error.statusCode = 400;
    throw error;
  }

  return {
    startDate,
    endDate,
  };
};

const findActiveSubscription = async ({ organizationId, now = new Date() }) => {
  const orgId = Number(organizationId);
  if (!Number.isFinite(orgId) || orgId <= 0) return null;

  const activeKey = `ORG_${orgId}`;

  return prisma.subscription.findFirst({
    where: {
      orgId,
      status: "ACTIVE",
      OR: [{ activeKey }, { activeKey: null }],
      startDate: {
        lte: now,
      },
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
        startDate: {
          lte: now,
        },
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
        startDate: {
          lte: now,
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
  resolveManagedSubscriptionWindow,
  syncOrganizationSubscriptionState,
};
