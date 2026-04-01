const { toSummaryItem } = require("./common.service");

const mapTeamRecord = (team) => {
  const sortedMembers = Array.isArray(team.members)
    ? [...team.members].sort((left, right) => {
        const leftName = String(left?.user?.name || "").trim().toLowerCase();
        const rightName = String(right?.user?.name || "").trim().toLowerCase();
        if (leftName !== rightName) return leftName.localeCompare(rightName);
        return Number(left?.userId || 0) - Number(right?.userId || 0);
      })
    : [];

  return {
    id: team.id,
    _id: team.id,
    name: team.name,
    description: team.description || "",
    leaderId: team.leaderId || null,
    leaderName: team.leader?.name || null,
    memberCount: Number(team._count?.members ?? team.members?.length ?? 0),
    memberIds: sortedMembers.map((member) => Number(member.userId)),
    memberNames: sortedMembers
      .map((member) => String(member?.user?.name || "").trim())
      .filter(Boolean),
    attendanceRadius: Number(team.attendanceRadius || 25),
    longitude: Number.isFinite(team.longitude) ? Number(team.longitude) : null,
    latitude: Number.isFinite(team.latitude) ? Number(team.latitude) : null,
    location:
      Number.isFinite(team.longitude) && Number.isFinite(team.latitude)
        ? [team.longitude, team.latitude]
        : null,
    isActive: Boolean(team.isActive),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  };
};

const buildTeamSummary = (teamItems = []) => {
  const totals = teamItems.reduce(
    (acc, team) => {
      acc.totalMembersAssigned += Number(team.memberCount || 0);
      if (team.leaderId) acc.teamsWithLeader += 1;
      return acc;
    },
    {
      teamsWithLeader: 0,
      totalMembersAssigned: 0,
    }
  );

  return [
    toSummaryItem("Teams", teamItems.length),
    toSummaryItem("Total Members Assigned", totals.totalMembersAssigned),
    toSummaryItem("Teams With Leader", totals.teamsWithLeader),
  ];
};

module.exports = {
  mapTeamRecord,
  buildTeamSummary,
};
