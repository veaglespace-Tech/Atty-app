const prisma = require('./lib/prisma');
async function check() {
  const users = await prisma.user.findMany({
    where: { expoPushToken: { not: null } },
    select: { email: true, expoPushToken: true }
  });
  console.log("Users with tokens:", users);
}
check().catch(console.error).finally(() => prisma.$disconnect());
