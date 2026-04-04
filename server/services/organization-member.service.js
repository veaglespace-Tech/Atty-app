const { normalizeRole } = require("../constants/rbac");

const getOrganizationMemberDelegate = (client) => {
  const delegate = client?.organizationMember;
  if (!delegate || typeof delegate !== "object") return null;
  return delegate;
};

const normalizeCreateInput = (input = {}) => {
  const userId = Number(input.userId);
  const orgId = Number(input.orgId);

  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("organization member userId is required");
  }

  if (!Number.isFinite(orgId) || orgId <= 0) {
    throw new Error("organization member orgId is required");
  }

  return {
    userId,
    orgId,
    role: normalizeRole(input.role || "MEMBER"),
    isActive: input.isActive !== false,
    joinedAt: input.joinedAt ? new Date(input.joinedAt) : new Date(),
  };
};

const createOrganizationMembership = async (client, input = {}) => {
  const data = normalizeCreateInput(input);
  const delegate = getOrganizationMemberDelegate(client);

  if (delegate && typeof delegate.create === "function") {
    return delegate.create({ data });
  }

  await client.$executeRaw`
    INSERT INTO organizationmember (userId, orgId, role, isActive, joinedAt)
    VALUES (${data.userId}, ${data.orgId}, ${data.role}, ${data.isActive}, ${data.joinedAt})
  `;

  return data;
};

const upsertOrganizationMembership = async (client, input = {}) => {
  const data = normalizeCreateInput(input);
  const delegate = getOrganizationMemberDelegate(client);

  if (delegate && typeof delegate.upsert === "function") {
    return delegate.upsert({
      where: {
        userId_orgId: {
          userId: data.userId,
          orgId: data.orgId,
        },
      },
      update: {
        role: data.role,
        isActive: data.isActive,
      },
      create: data,
    });
  }

  await client.$executeRaw`
    INSERT INTO organizationmember (userId, orgId, role, isActive, joinedAt)
    VALUES (${data.userId}, ${data.orgId}, ${data.role}, ${data.isActive}, ${data.joinedAt})
    ON DUPLICATE KEY UPDATE
      role = VALUES(role),
      isActive = VALUES(isActive)
  `;

  return data;
};

module.exports = {
  createOrganizationMembership,
  upsertOrganizationMembership,
};
