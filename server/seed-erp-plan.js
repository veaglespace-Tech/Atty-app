const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding ERP_ADDON plan...");

  try {
    const existing = await prisma.plan.findFirst({
      where: { code: "ERP_ADDON" },
    });

    if (existing) {
      console.log("ERP_ADDON plan already exists. Exiting.");
      return;
    }

    await prisma.plan.create({
      data: {
        code: "ERP_ADDON",
        name: "Funds & Expenses ERP",
        price: 1000,
        currency: "INR",
        durationInDays: 365,
        isActive: true,
        maxUsers: 99999,
        maxLocations: 99999,
        maxTeams: 99999,
        memberLimit: 99999,
        features: ["Funds Module", "Expenses Module", "Claims & Reimbursements", "Wallet Management"],
      },
    });

    console.log("Successfully created ERP_ADDON plan!");
  } catch (err) {
    console.error("Error seeding ERP_ADDON plan:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
