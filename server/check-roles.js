const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: { name: true, role: true, memberships: { select: { role: true, orgId: true } } }
  });
  console.dir(users, { depth: null });
}
main().finally(() => prisma.$disconnect());
