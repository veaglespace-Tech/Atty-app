const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ take: 2 });
  console.log("Users:", users.map(u => ({ id: u.id, role: u.role, permissions: u.permissions })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
