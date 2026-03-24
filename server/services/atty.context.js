const prisma = require("../lib/prisma");
const { resolveUserPermissions } = require("../constants/permissions");

const buildAttyContext = async (user) => {
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

    const teams =
      dbUser.role === "TEAM_LEADER"
        ? dbUser.teamsLed.map((t) => t.name)
        : dbUser.teamMemberships.map((tm) => tm.team.name);

    const permissions = resolveUserPermissions(dbUser);

    return {
      userId: dbUser.id,
      userName: dbUser.name,
      userRole: dbUser.role,
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
  userRole: user?.role || "MEMBER",
  orgId: user?.organizationId || null,
  orgName: null,
  orgCode: null,
  subscriptionStatus: "UNKNOWN",
  subscriptionExpiry: null,
  planName: null,
  planCode: null,
  maxUsers: null,
  maxTeams: null,
  teams: [],
  permissions: [],
});

module.exports = { buildAttyContext };
