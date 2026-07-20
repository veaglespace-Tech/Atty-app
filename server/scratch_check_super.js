const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@veagle.com' }
  });
  console.log("SuperAdmin:", superAdmin ? "Found" : "Not Found");
}
main().finally(() => prisma.$disconnect());
