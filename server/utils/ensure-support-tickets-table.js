const prisma = require("../lib/prisma");

let ensureSupportTicketsTablePromise = null;

const supportTicketsTableSql = `
  CREATE TABLE IF NOT EXISTS \`support_tickets\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`role\` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
    \`subject\` VARCHAR(191) NOT NULL DEFAULT 'Support Query',
    \`message\` TEXT NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    \`orgId\` INTEGER NULL,
    \`userId\` INTEGER NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`support_tickets_orgId_idx\` (\`orgId\`),
    INDEX \`support_tickets_status_idx\` (\`status\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const ensureSupportTicketsTable = async () => {
  if (!ensureSupportTicketsTablePromise) {
    ensureSupportTicketsTablePromise = prisma.$executeRawUnsafe(
      supportTicketsTableSql,
    );
  }

  try {
    await ensureSupportTicketsTablePromise;
  } catch (error) {
    ensureSupportTicketsTablePromise = null;
    throw error;
  }
};

module.exports = { ensureSupportTicketsTable };
