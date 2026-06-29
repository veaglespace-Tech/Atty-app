const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.registrationLead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Leads:", leads);
  
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log("Recent Orgs:", orgs.map(o => ({ email: o.email, name: o.name })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
