const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.registrationLead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('Recent Leads:', leads.map(l => ({ id: l.id, email: l.organizationEmail, date: l.createdAt })));
  
  const orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('Recent Orgs:', orgs.map(o => ({ id: o.id, email: o.email, date: o.createdAt })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
