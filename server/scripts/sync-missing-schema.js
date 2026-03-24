const prisma = require("../lib/prisma");

const ddlStatements = [
  `
    CREATE TABLE IF NOT EXISTS \`archive_org\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`orgId\` INTEGER NULL,
      \`name\` VARCHAR(191) NULL,
      \`organizationCode\` VARCHAR(191) NULL,
      \`email\` VARCHAR(191) NULL,
      \`phone\` VARCHAR(191) NULL,
      \`phoneCountryCode\` VARCHAR(191) NULL,
      \`address\` VARCHAR(191) NULL,
      \`city\` VARCHAR(191) NULL,
      \`state\` VARCHAR(191) NULL,
      \`country\` VARCHAR(191) NULL,
      \`latitude\` DOUBLE NULL,
      \`longitude\` DOUBLE NULL,
      \`attendanceRadius\` INTEGER NULL,
      \`subscriptionStatus\` VARCHAR(191) NULL,
      \`subscriptionExpiry\` DATETIME(3) NULL,
      \`planId\` INTEGER NULL,
      \`subscriptionId\` INTEGER NULL,
      \`isActive\` BOOLEAN NULL,
      \`isBlocked\` BOOLEAN NULL,
      \`deletedAt\` DATETIME(3) NULL,
      \`archivedById\` INTEGER NULL,
      \`archiveReason\` VARCHAR(191) NOT NULL DEFAULT '',
      \`archivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`originalCreatedAt\` DATETIME(3) NULL,
      \`originalUpdatedAt\` DATETIME(3) NULL,
      \`metadata\` JSON NULL,
      INDEX \`archive_org_orgId_idx\`(\`orgId\`),
      INDEX \`archive_org_organizationCode_idx\`(\`organizationCode\`),
      INDEX \`archive_org_email_idx\`(\`email\`),
      INDEX \`archive_org_archivedAt_idx\`(\`archivedAt\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS \`archive_user\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`userId\` INTEGER NULL,
      \`orgId\` INTEGER NULL,
      \`name\` VARCHAR(191) NULL,
      \`email\` VARCHAR(191) NULL,
      \`mobile\` VARCHAR(191) NULL,
      \`mobileCountryCode\` VARCHAR(191) NULL,
      \`password\` VARCHAR(191) NULL,
      \`role\` VARCHAR(191) NULL,
      \`permissions\` JSON NULL,
      \`status\` VARCHAR(191) NULL,
      \`isActive\` BOOLEAN NULL,
      \`lastLoginAt\` DATETIME(3) NULL,
      \`createdById\` INTEGER NULL,
      \`deletedAt\` DATETIME(3) NULL,
      \`archivedById\` INTEGER NULL,
      \`archiveReason\` VARCHAR(191) NOT NULL DEFAULT '',
      \`archivedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`originalCreatedAt\` DATETIME(3) NULL,
      \`originalUpdatedAt\` DATETIME(3) NULL,
      \`metadata\` JSON NULL,
      INDEX \`archive_user_userId_idx\`(\`userId\`),
      INDEX \`archive_user_orgId_role_idx\`(\`orgId\`, \`role\`),
      INDEX \`archive_user_email_idx\`(\`email\`),
      INDEX \`archive_user_archivedAt_idx\`(\`archivedAt\`),
      PRIMARY KEY (\`id\`)
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `,
  `
    CREATE TABLE IF NOT EXISTS \`posts\` (
      \`id\` INTEGER NOT NULL AUTO_INCREMENT,
      \`orgId\` INTEGER NOT NULL,
      \`authorId\` INTEGER NOT NULL,
      \`title\` VARCHAR(191) NOT NULL,
      \`content\` TEXT NOT NULL,
      \`type\` VARCHAR(191) NOT NULL DEFAULT 'NOTIFICATION',
      \`metadata\` JSON NULL,
      \`isActive\` BOOLEAN NOT NULL DEFAULT true,
      \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updatedAt\` DATETIME(3) NOT NULL,
      \`deletedAt\` DATETIME(3) NULL,
      INDEX \`posts_orgId_isActive_idx\`(\`orgId\`, \`isActive\`),
      INDEX \`posts_authorId_idx\`(\`authorId\`),
      INDEX \`posts_type_idx\`(\`type\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`posts_orgId_fkey\` FOREIGN KEY (\`orgId\`) REFERENCES \`Organization\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT \`posts_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE
    ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `,
];

const copyArchiveOrgSql = `
  INSERT INTO \`archive_org\` (
    \`id\`, \`orgId\`, \`name\`, \`organizationCode\`, \`email\`, \`phone\`,
    \`phoneCountryCode\`, \`address\`, \`city\`, \`state\`, \`country\`,
    \`latitude\`, \`longitude\`, \`attendanceRadius\`, \`subscriptionStatus\`,
    \`subscriptionExpiry\`, \`planId\`, \`subscriptionId\`, \`isActive\`,
    \`isBlocked\`, \`deletedAt\`, \`archivedById\`, \`archiveReason\`,
    \`archivedAt\`, \`originalCreatedAt\`, \`originalUpdatedAt\`, \`metadata\`
  )
  SELECT
    source.\`id\`, source.\`orgId\`, source.\`name\`, source.\`organizationCode\`,
    source.\`email\`, source.\`phone\`, source.\`phoneCountryCode\`,
    source.\`address\`, source.\`city\`, source.\`state\`, source.\`country\`,
    source.\`latitude\`, source.\`longitude\`, source.\`attendanceRadius\`,
    source.\`subscriptionStatus\`, source.\`subscriptionExpiry\`, source.\`planId\`,
    source.\`subscriptionId\`, source.\`isActive\`, source.\`isBlocked\`,
    source.\`deletedAt\`, source.\`archivedById\`, source.\`archiveReason\`,
    source.\`archivedAt\`, source.\`originalCreatedAt\`, source.\`originalUpdatedAt\`,
    source.\`metadata\`
  FROM \`archieve_org\` source
  LEFT JOIN \`archive_org\` target ON target.\`id\` = source.\`id\`
  WHERE target.\`id\` IS NULL
`;

const copyArchiveUserSql = `
  INSERT INTO \`archive_user\` (
    \`id\`, \`userId\`, \`orgId\`, \`name\`, \`email\`, \`mobile\`,
    \`mobileCountryCode\`, \`password\`, \`role\`, \`permissions\`, \`status\`,
    \`isActive\`, \`lastLoginAt\`, \`createdById\`, \`deletedAt\`, \`archivedById\`,
    \`archiveReason\`, \`archivedAt\`, \`originalCreatedAt\`, \`originalUpdatedAt\`,
    \`metadata\`
  )
  SELECT
    source.\`id\`, source.\`userId\`, source.\`orgId\`, source.\`name\`,
    source.\`email\`, source.\`mobile\`, source.\`mobileCountryCode\`,
    source.\`password\`, source.\`role\`, source.\`permissions\`, source.\`status\`,
    source.\`isActive\`, source.\`lastLoginAt\`, source.\`createdById\`,
    source.\`deletedAt\`, source.\`archivedById\`, source.\`archiveReason\`,
    source.\`archivedAt\`, source.\`originalCreatedAt\`, source.\`originalUpdatedAt\`,
    source.\`metadata\`
  FROM \`archieve_user\` source
  LEFT JOIN \`archive_user\` target ON target.\`id\` = source.\`id\`
  WHERE target.\`id\` IS NULL
`;

const teamMemberOverviewStatements = [
  "DROP VIEW IF EXISTS `team_member_overview`",
  `
    CREATE VIEW \`team_member_overview\` AS
    SELECT
      t.\`id\` AS \`teamId\`,
      t.\`name\` AS \`teamName\`,
      t.\`orgId\` AS \`orgId\`,
      t.\`leaderId\` AS \`leaderId\`,
      t.\`isActive\` AS \`isActive\`,
      tm.\`id\` AS \`teamMemberId\`,
      tm.\`userId\` AS \`userId\`,
      u.\`name\` AS \`memberName\`,
      u.\`email\` AS \`memberEmail\`,
      tm.\`createdAt\` AS \`memberAddedAt\`
    FROM \`Team\` t
    LEFT JOIN \`TeamMember\` tm ON tm.\`teamId\` = t.\`id\`
    LEFT JOIN \`User\` u ON u.\`id\` = tm.\`userId\`
    WHERE t.\`deletedAt\` IS NULL
  `,
];

const tableExists = async (tableName) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '${tableName}'`,
  );
  return rows.length > 0;
};

const syncMissingSchema = async () => {
  for (const statement of ddlStatements) {
    await prisma.$executeRawUnsafe(statement);
  }

  if (await tableExists("archieve_org")) {
    await prisma.$executeRawUnsafe(copyArchiveOrgSql);
  }

  if (await tableExists("archieve_user")) {
    await prisma.$executeRawUnsafe(copyArchiveUserSql);
  }

  for (const statement of teamMemberOverviewStatements) {
    await prisma.$executeRawUnsafe(statement);
  }
};

if (require.main === module) {
  syncMissingSchema()
    .then(async () => {
      console.log("Missing schema synced.");
      await prisma.$disconnect().catch(() => {});
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Schema sync failed:", error.message || error);
      await prisma.$disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { syncMissingSchema };
