const prisma = require("../lib/prisma");

async function main() {
  try {
    console.log("--- USERS ---");
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        orgId: true,
        status: true,
        isActive: true
      }
    });
    console.log(users);

    console.log("--- ORGANIZATIONS ---");
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        organizationCode: true,
        email: true,
        phone: true,
        subscriptionStatus: true,
        subscriptionExpiry: true,
        isActive: true,
        isBlocked: true
      }
    });
    console.log(orgs);
  } catch (err) {
    console.error("Failed to query DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
