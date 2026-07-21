const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const perms = await prisma.rolePermission.findMany({
    where: { role: 'SUB_ADMIN' },
    include: { permission: true }
  });
  console.log(perms.map(p => p.permission.key));
}

main().catch(console.error).finally(() => prisma.$disconnect());
