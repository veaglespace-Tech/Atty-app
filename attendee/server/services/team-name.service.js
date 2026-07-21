const TEAM_NAME_MAX_LENGTH = 120;

const buildArchivedTeamName = ({ name, teamId }) => {
  const safeName = String(name || "Team").trim() || "Team";
  const suffix = `__deleted_${teamId}`;
  const maxBaseLength = Math.max(1, TEAM_NAME_MAX_LENGTH - suffix.length);
  const trimmedBase = safeName.slice(0, maxBaseLength).trim() || "Team";
  return `${trimmedBase}${suffix}`;
};

const reclaimSoftDeletedTeamName = async ({ tx, orgId, name, excludeTeamId = null }) => {
  const safeName = String(name || "").trim();
  if (!safeName) return;

  const where = {
    orgId: Number(orgId),
    name: safeName,
    deletedAt: {
      not: null,
    },
  };

  if (excludeTeamId) {
    where.id = {
      not: Number(excludeTeamId),
    };
  }

  const softDeletedConflicts = await tx.team.findMany({
    where,
    select: {
      id: true,
      name: true,
    },
  });

  for (const conflict of softDeletedConflicts) {
    await tx.team.update({
      where: { id: conflict.id },
      data: {
        name: buildArchivedTeamName({
          name: conflict.name,
          teamId: conflict.id,
        }),
      },
    });
  }
};

const softDeleteTeamRecord = async ({ tx, teamId }) => {
  const existing = await tx.team.findUnique({
    where: { id: Number(teamId) },
    select: {
      id: true,
      name: true,
    },
  });

  if (!existing) {
    const error = new Error("Team not found");
    error.statusCode = 404;
    throw error;
  }

  return tx.team.update({
    where: { id: existing.id },
    data: {
      name: buildArchivedTeamName({
        name: existing.name,
        teamId: existing.id,
      }),
      deletedAt: new Date(),
      isActive: false,
    },
  });
};

const isTeamNameUniqueConstraintError = (error) => error?.code === "P2002";

module.exports = {
  reclaimSoftDeletedTeamName,
  softDeleteTeamRecord,
  isTeamNameUniqueConstraintError,
};
