const { PERMISSIONS, hasPermission } = require("../constants/permissions");
const prisma = require("../lib/prisma");

/**
 * Validates if the user can view the team collection.
 * Returns the condition (where clause) to apply for ABAC.
 */
const getTeamViewCondition = (user, orgId) => {
  if (hasPermission(user, PERMISSIONS.TEAM.VIEW_ALL, orgId)) {
    return {}; // Can see all teams in org
  }
  
  if (hasPermission(user, PERMISSIONS.TEAM.VIEW_OWN, orgId)) {
    return {
      OR: [
        { leaderId: user.id },
        { teamMembers: { some: { userId: user.id } } }
      ]
    };
  }

  // Deny access
  return null;
};

/**
 * Validates if the user has ABAC rights to a specific team record.
 */
const canViewTeam = async (user, teamId, orgId) => {
  if (hasPermission(user, PERMISSIONS.TEAM.VIEW_ALL, orgId)) return true;
  if (!hasPermission(user, PERMISSIONS.TEAM.VIEW_OWN, orgId)) return false;

  const team = await prisma.team.findFirst({
    where: {
      id: Number(teamId),
      orgId,
      deletedAt: null,
      OR: [
        { leaderId: user.id },
        { teamMembers: { some: { userId: user.id } } }
      ]
    },
    select: { id: true }
  });

  return !!team;
};

module.exports = {
  getTeamViewCondition,
  canViewTeam,
};
