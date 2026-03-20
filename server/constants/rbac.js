const ROLE_ROUTE_PREFIX = Object.freeze({
  SUPER_ADMIN: "/super-admin",
  ORG_ADMIN: "/org",
  SUB_ADMIN: "/org",
  TEAM_LEADER: "/team-leader",
  MEMBER: "/member",
});

const LEGACY_ROLE_MAP = Object.freeze({
  SUPERADMIN: "SUPER_ADMIN",
  ORGADMIN: "ORG_ADMIN",
  ADMIN: "ORG_ADMIN",
  SUBADMIN: "SUB_ADMIN",
  TEAMLEADER: "TEAM_LEADER",
  TEAM_LEADER: "TEAM_LEADER",
  TEAMLEAD: "TEAM_LEADER",
  MEMBER: "MEMBER",
  SUPER_ADMIN: "SUPER_ADMIN",
  ORG_ADMIN: "ORG_ADMIN",
  SUB_ADMIN: "SUB_ADMIN",
});

const ALL_ROLES = Object.freeze([
  "SUPER_ADMIN",
  "ORG_ADMIN",
  "SUB_ADMIN",
  "TEAM_LEADER",
  "MEMBER",
]);

const ORG_SCOPED_ROLES = Object.freeze([
  "ORG_ADMIN",
  "SUB_ADMIN",
  "TEAM_LEADER",
  "MEMBER",
]);

function normalizeRole(role) {
  if (!role) return "MEMBER";
  const rawRole = String(role).toUpperCase().trim();
  const normalizedWithUnderscore = rawRole.replace(/[\s-]+/g, "_");
  const compact = normalizedWithUnderscore.replace(/_/g, "");

  return (
    LEGACY_ROLE_MAP[rawRole] ||
    LEGACY_ROLE_MAP[normalizedWithUnderscore] ||
    LEGACY_ROLE_MAP[compact] ||
    "MEMBER"
  );
}

function getDashboardPathByRole(role) {
  const normalizedRole = normalizeRole(role);
  const root = ROLE_ROUTE_PREFIX[normalizedRole] || ROLE_ROUTE_PREFIX.MEMBER;
  return `${root}/dashboard`;
}

module.exports = {
  ROLE_ROUTE_PREFIX,
  LEGACY_ROLE_MAP,
  ALL_ROLES,
  ORG_SCOPED_ROLES,
  normalizeRole,
  getDashboardPathByRole,
};