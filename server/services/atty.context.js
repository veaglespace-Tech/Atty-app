const prisma = require("../lib/prisma");
const { resolveUserPermissions } = require("../constants/permissions");
const { resolveUserRole, resolveOrganizationId } = require("../utils/membership");

const buildGuestContext = () => ({
  userId: null,
  userName: "Guest",
  userRole: "GUEST",
  orgId: null,
  orgName: null,
  orgCode: null,
  subscriptionStatus: "NONE",
  subscriptionExpiry: null,
  planName: null,
  planCode: null,
  maxUsers: null,
  maxTeams: null,
  teams: [],
  permissions: [],
});

const buildAttyContext = async (user) => {
  if (!user?.id) {
    return buildGuestContext();
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: Number(user.id) },
      include: {
        organization: {
          include: {
            activeSubscription: {
              include: { plan: true },
            },
          },
        },
        memberships: true,
        teamsLed: {
          select: { id: true, name: true },
        },
        teamMemberships: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!dbUser) return buildFallback(user);

    const org = dbUser.organization;
    const sub = org?.activeSubscription || null;
    const plan = sub?.plan || null;
    const subStatus = org?.subscriptionStatus || "NONE";
    const orgId = resolveOrganizationId(dbUser);
    const userRole = resolveUserRole(dbUser, orgId) || "MEMBER";

    const teams =
      userRole === "TEAM_LEADER"
        ? dbUser.teamsLed.map((t) => t.name)
        : dbUser.teamMemberships.map((tm) => tm.team.name);

    const permissions = resolveUserPermissions(dbUser, orgId);

    return {
      userId: dbUser.id,
      userName: dbUser.name,
      userRole,
      orgId: org?.id || null,
      orgName: org?.name || null,
      orgCode: org?.organizationCode || null,
      subscriptionStatus: subStatus,
      subscriptionExpiry: org?.subscriptionExpiry || null,
      planName: plan?.name || sub?.planName || null,
      planCode: sub?.planCode || null,
      maxUsers: plan?.maxUsers || null,
      maxTeams: plan?.maxTeams || null,
      teams,
      permissions,
    };
  } catch (err) {
    console.error("[Atty] buildAttyContext error:", err.message);
    return buildFallback(user);
  }
};

const buildFallback = (user) => ({
  userId: user?.id || null,
  userName: user?.name || "User",
  userRole: resolveUserRole(user, resolveOrganizationId(user)) || "MEMBER",
  orgId: resolveOrganizationId(user),
  orgName: null,
  orgCode: null,
  subscriptionStatus: "UNKNOWN",
  subscriptionExpiry: null,
  planName: null,
  planCode: null,
  maxUsers: null,
  maxTeams: null,
  teams: [],
  permissions: resolveUserPermissions(user, resolveOrganizationId(user)),
});

module.exports = { buildAttyContext };
