const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    where: { name: { contains: 'John' } },
    include: { memberships: true }
  });
  console.log("John Users:", JSON.stringify(users, null, 2));
}
run().finally(() => prisma.$disconnect());
