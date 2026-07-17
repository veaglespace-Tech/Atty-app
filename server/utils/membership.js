const { normalizeRole } = require("../constants/rbac");

const parseOrganizationId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const ROLE_PRIORITY = Object.freeze({
  MEMBER: 1,
  LIFE_MEMBER: 1,
  TEAM_LEADER: 2,
  SUB_ADMIN: 3,
  ORG_ADMIN: 4,
  SUPER_ADMIN: 5,
});

const normalizeMembership = (membership) => {
  if (!membership || typeof membership !== "object") return null;

  const orgId = parseOrganizationId(membership.orgId);
  if (!orgId) return null;

  return {
    ...membership,
    orgId,
    role: normalizeRole(membership.role),
    isActive: membership.isActive !== false,
  };
};

const normalizeMemberships = (memberships = []) =>
  (Array.isArray(memberships) ? memberships : [])
    .map(normalizeMembership)
    .filter(Boolean);

const buildLegacyMembership = (user, orgId = null) => {
  if (!user || typeof user !== "object") return null;

  const targetOrgId =
    parseOrganizationId(orgId) ||
    parseOrganizationId(user?.organization?.id) ||
    parseOrganizationId(user?.orgId) ||
    parseOrganizationId(user?.organizationId);
  const role = normalizeRole(user?.role);

  if (!targetOrgId || !role || role === "SUPER_ADMIN") {
    return null;
  }

  return {
    orgId: targetOrgId,
    role,
    isActive: user.isActive !== false,
  };
};

const mergePreferredMembershipRole = (membership, legacyMembership) => {
  if (!membership) return legacyMembership || null;
  if (!legacyMembership) return membership;
  if (membership.orgId !== legacyMembership.orgId) return membership;
  if (membership.isActive === false) return membership;

  const membershipRole = normalizeRole(membership.role);
  const legacyRole = normalizeRole(legacyMembership.role);
  const membershipPriority = ROLE_PRIORITY[membershipRole] || 0;
  const legacyPriority = ROLE_PRIORITY[legacyRole] || 0;

  if (legacyPriority <= membershipPriority) {
    return membership;
  }

  return {
    ...membership,
    role: legacyRole,
  };
};

const resolveOrganizationId = (user, fallback = null) => {
  const directOrganization =
    user?.organization && typeof user.organization === "object"
      ? user.organization.id
      : user?.organization;

  return (
    parseOrganizationId(user?.organizationId) ||
    parseOrganizationId(user?.orgId) ||
    parseOrganizationId(directOrganization) ||
    parseOrganizationId(fallback)
  );
};

const resolveMembership = (user, orgId = null) => {
  const memberships = normalizeMemberships(user?.memberships);
  const targetOrgId = resolveOrganizationId(user, orgId);
  if (!targetOrgId) return null;
  const membership = memberships.find((entry) => entry.orgId === targetOrgId) || null;
  const legacyMembership = buildLegacyMembership(user, targetOrgId);
  return mergePreferredMembershipRole(membership, legacyMembership);
};

const resolveAccessibleRoles = (user, orgId = null) => {
  const memberships = normalizeMemberships(user?.memberships);
  const targetOrgId = resolveOrganizationId(user, orgId);

  if (targetOrgId) {
    const membership = memberships.find((entry) => entry.orgId === targetOrgId) || null;
    const legacyMembership = buildLegacyMembership(user, targetOrgId);
    const resolvedMembership = mergePreferredMembershipRole(membership, legacyMembership);

    if (resolvedMembership && resolvedMembership.isActive !== false) {
      return [resolvedMembership.role];
    }

    return [];
  }

  const activeMembershipRoles = memberships
    .filter((membership) => membership.isActive !== false)
    .map((membership) => membership.role);

  if (activeMembershipRoles.length > 0) {
    return activeMembershipRoles;
  }

  const directRole = normalizeRole(user?.role);
  if (directRole && user?.isActive !== false) {
    return [directRole];
  }

  return [];
};

const resolveUserRole = (user, orgId = null) => {
  if (!user) return null;
  if (typeof user === "string") return normalizeRole(user);

  const accessibleRoles = resolveAccessibleRoles(user, orgId);
  if (accessibleRoles.length === 0) return null;

  if (accessibleRoles.includes("SUPER_ADMIN")) {
    return "SUPER_ADMIN";
  }

  return accessibleRoles[0] || null;
};

const hasRole = (user, role, orgId = null) => {
  const normalizedRole = normalizeRole(role);
  return resolveAccessibleRoles(user, orgId).includes(normalizedRole);
};

module.exports = {
  normalizeMembership,
  normalizeMemberships,
  resolveOrganizationId,
  resolveMembership,
  resolveAccessibleRoles,
  resolveUserRole,
  hasRole,
};
