const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.registrationLead.findMany();
  console.log('Leads:', leads);
}

main().catch(console.error).finally(() => prisma.$disconnect());
