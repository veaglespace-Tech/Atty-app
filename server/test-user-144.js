const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findUnique({
    where: { id: 144 },
    include: { memberships: true }
  });
  console.log("User 144:", JSON.stringify(user, null, 2));
}
run().finally(() => prisma.$disconnect());
