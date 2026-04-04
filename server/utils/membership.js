const { normalizeRole } = require("../constants/rbac");

const parseOrganizationId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

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
  return (
    memberships.find((membership) => membership.orgId === targetOrgId) ||
    buildLegacyMembership(user, targetOrgId)
  );
};

const resolveAccessibleRoles = (user, orgId = null) => {
  const memberships = normalizeMemberships(user?.memberships);
  const targetOrgId = resolveOrganizationId(user, orgId);

  if (targetOrgId) {
    const membership = memberships.find((entry) => entry.orgId === targetOrgId);
    if (membership && membership.isActive !== false) {
      return [membership.role];
    }

    const legacyMembership = buildLegacyMembership(user, targetOrgId);
    if (legacyMembership && legacyMembership.isActive !== false) {
      return [legacyMembership.role];
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
