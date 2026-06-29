const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ where: { email: 'contact@acme.com' } });
  console.log('Org:', org);
}

main().catch(console.error).finally(() => prisma.$disconnect());
