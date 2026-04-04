const { resolveUserPermissions } = require("../constants/permissions");
const {
  normalizeMemberships,
  resolveMembership,
  resolveOrganizationId,
  resolveUserRole,
} = require("./membership");

const normalizeUser = (user, organization = null) => {
  if (!user) return null;

  const normalizedMemberships = normalizeMemberships(user.memberships);
  const resolvedOrganization = organization || user.organization || null;
  const organizationId = resolveOrganizationId(
    {
      ...user,
      organization: resolvedOrganization,
      memberships: normalizedMemberships,
    },
    resolvedOrganization?.id
  );
  const currentMembership = resolveMembership(
    {
      ...user,
      organization: resolvedOrganization,
      organizationId,
      memberships: normalizedMemberships,
    },
    organizationId
  );
  const currentRole = resolveUserRole(
    {
      ...user,
      organization: resolvedOrganization,
      organizationId,
      memberships: normalizedMemberships,
    },
    organizationId
  );
  const resolvedPermissions = resolveUserPermissions(
    {
      ...user,
      organization: resolvedOrganization,
      organizationId,
      memberships: normalizedMemberships,
    },
    organizationId
  );

  return {
    ...user,
    memberships: normalizedMemberships,
    currentMembership,
    currentRole,
    permissions: resolvedPermissions,
    organizationId,
    organization: resolvedOrganization || organizationId,
  };
};

module.exports = {
  normalizeUser,
};
