const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CORE_ROLES = [
  { code: "SUPER_ADMIN", name: "Super Admin", dashboardPath: "/super-admin", isSystem: true },
  { code: "ORG_ADMIN", name: "Org Admin", dashboardPath: "/org", isSystem: true },
  { code: "SUB_ADMIN", name: "Sub Admin", dashboardPath: "/org", isSystem: true },
  { code: "TEAM_LEADER", name: "Team Leader", dashboardPath: "/team-leader", isSystem: true },
  { code: "MEMBER", name: "Member", dashboardPath: "/member", isSystem: true },
];

async function main() {
  for (const role of CORE_ROLES) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: role,
    });
  }
  console.log("Core roles initialized.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
