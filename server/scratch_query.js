const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log("All users:", users);
  
  try {
    const orgs = await prisma.organization.findMany();
    console.log("Organizations:", orgs);
  } catch (e) {}
}

main().finally(() => prisma.$disconnect());
