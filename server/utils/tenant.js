const resolveOrganizationId = (user) =>
  user?.organizationId || user?.organization || user?.orgId || null;

const buildOrgScope = (organizationId) => {
  if (!organizationId) {
    return {};
  }

  return {
    orgId: Number(organizationId),
  };
};

const todayKey = () => new Date().toISOString().split("T")[0];

const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

const clamp = (value, min, max, fallback) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

module.exports = {
  resolveOrganizationId,
  buildOrgScope,
  todayKey,
  daysAgoKey,
  clamp,
};