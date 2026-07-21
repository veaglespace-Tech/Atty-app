const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.organization.findMany().then(orgs => {
  console.log(JSON.stringify(orgs.map(o => ({ id: o.id, name: o.name, logoUrl: o.logoUrl })), null, 2));
  prisma.$disconnect();
});
