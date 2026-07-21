const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const requests = await prisma.registrationRequest.findMany({
      where: {
        status: "PENDING",
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: "desc" }
    });
    console.log("Success:", requests);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
