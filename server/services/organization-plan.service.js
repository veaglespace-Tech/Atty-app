const prisma = require("../lib/prisma");

const normalizeLimit = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
};

const isFreePlan = ({ plan = null, subscriptionStatus = "" } = {}) => {
  const normalizedStatus = String(subscriptionStatus || "").trim().toUpperCase();
  const code = String(plan?.code || "").trim().toUpperCase();
  const price = Number(plan?.price || 0);

  if (normalizedStatus === "TRIAL") return true;
  return code.includes("FREE") || price <= 0;
};

const getOrganizationPlanLimits = async (orgId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: Number(orgId) },
    select: {
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          memberLimit: true,
          maxUsers: true,
          maxTeams: true,
          maxLocations: true,
        },
      },
    },
  });

  if (!organization) return null;

  return {
    planId: organization.plan?.id || null,
    planName: organization.plan?.name || "TRIAL",
    planCode: organization.plan?.code || "",
    maxUsers: normalizeLimit(
      organization.plan?.memberLimit || organization.plan?.maxUsers || 0
    ),
    maxTeams: normalizeLimit(organization.plan?.maxTeams || 0),
    maxLocations: normalizeLimit(organization.plan?.maxLocations || 0),
  };
};

const assertWithinPlanUserLimit = async ({ orgId, res, additionalUsers = 1 }) => {
  const limits = await getOrganizationPlanLimits(orgId);
  const maxUsers = Number(limits?.maxUsers || 0);

  if (maxUsers > 0) {
    const currentUsers = await prisma.user.count({
      where: {
        orgId: Number(orgId),
        deletedAt: null,
      },
    });

    if (currentUsers + Math.max(1, Number(additionalUsers || 1)) > maxUsers) {
      res.status(403);
      throw new Error(
        `User limit reached for the current plan (${maxUsers} users). Upgrade your plan to add more users.`
      );
    }
  }

  return limits;
};

const assertWithinPlanTeamLimit = async ({ orgId, res, additionalTeams = 1 }) => {
  const limits = await getOrganizationPlanLimits(orgId);
  const maxTeams = Number(limits?.maxTeams || 0);

  if (maxTeams > 0) {
    const currentTeams = await prisma.team.count({
      where: {
        orgId: Number(orgId),
        deletedAt: null,
      },
    });

    if (currentTeams + Math.max(1, Number(additionalTeams || 1)) > maxTeams) {
      res.status(403);
      throw new Error(
        `Team limit reached for the current plan (${maxTeams} teams). Upgrade your plan to create more teams.`
      );
    }
  }

  return limits;
};

module.exports = {
  getOrganizationPlanLimits,
  assertWithinPlanUserLimit,
  assertWithinPlanTeamLimit,
  isFreePlan,
};
