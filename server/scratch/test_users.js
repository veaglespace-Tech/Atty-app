const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const users = await prisma.user.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        mobileCountryCode: true,
        role: true,
        status: true,
        isActive: true,
        createdAt: true,
        orgId: true,
        organization: {
          select: {
            name: true,
            code: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    console.log("Found users:", users.length);
    if (users.length > 0) {
      console.log(users[0]);
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
