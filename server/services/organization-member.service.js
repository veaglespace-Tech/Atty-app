const { normalizeRole } = require("../constants/rbac");

const getOrganizationMemberDelegate = (client) => {
  const delegate = client?.organizationMember;
  if (!delegate || typeof delegate !== "object") return null;
  return delegate;
};

const MEMBERSHIP_TABLE_CANDIDATES = [
  "OrganizationMember",
  "organizationmember",
  "organization_member",
];

let ensureOrganizationMemberTablePromise = null;

const isMissingTableError = (error) => {
  if (!error) return false;

  const directCode = String(error.code || "");
  const metaCode = String(error?.meta?.code || "");
  const message = String(error.message || "").toLowerCase();

  return (
    directCode === "ER_NO_SUCH_TABLE" ||
    (directCode === "P2010" && metaCode === "1146") ||
    message.includes("doesn't exist") ||
    message.includes("does not exist")
  );
};

const organizationMemberTableSql = `
  CREATE TABLE IF NOT EXISTS \`OrganizationMember\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`userId\` INTEGER NOT NULL,
    \`orgId\` INTEGER NOT NULL,
    \`role\` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`joinedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`OrganizationMember_userId_orgId_key\`(\`userId\`, \`orgId\`),
    INDEX \`OrganizationMember_orgId_role_idx\`(\`orgId\`, \`role\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const ensureOrganizationMemberTable = async (client) => {
  if (!ensureOrganizationMemberTablePromise) {
    ensureOrganizationMemberTablePromise = client.$executeRawUnsafe(organizationMemberTableSql);
  }

  try {
    await ensureOrganizationMemberTablePromise;
  } catch (error) {
    ensureOrganizationMemberTablePromise = null;
    throw error;
  }
};

const executeMembershipWrite = async (client, buildQuery) => {
  let lastError = null;

  for (const tableName of MEMBERSHIP_TABLE_CANDIDATES) {
    try {
      return await buildQuery(tableName);
    } catch (error) {
      lastError = error;
      if (!isMissingTableError(error)) {
        throw error;
      }
    }
  }

  await ensureOrganizationMemberTable(client);

  try {
    return await buildQuery("OrganizationMember");
  } catch (error) {
    if (isMissingTableError(error)) {
      const finalError = new Error(
        `Organization membership table not found. Tried: ${MEMBERSHIP_TABLE_CANDIDATES.join(
          ", "
        )}, then attempted to auto-create OrganizationMember.`
      );
      finalError.cause = error;
      throw finalError;
    }

    throw error;
  }
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

  await executeMembershipWrite(client, (tableName) =>
    client.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (userId, orgId, role, isActive, joinedAt) VALUES (?, ?, ?, ?, ?)`,
      data.userId,
      data.orgId,
      data.role,
      data.isActive,
      data.joinedAt
    )
  );

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

  await executeMembershipWrite(client, (tableName) =>
    client.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (userId, orgId, role, isActive, joinedAt)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         role = VALUES(role),
         isActive = VALUES(isActive)`,
      data.userId,
      data.orgId,
      data.role,
      data.isActive,
      data.joinedAt
    )
  );

  return data;
};

module.exports = {
  createOrganizationMembership,
  upsertOrganizationMembership,
};
