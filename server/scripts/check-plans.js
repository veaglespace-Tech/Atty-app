const prisma = require("../lib/prisma");

async function check() {
  const plans = await prisma.permission.findMany(); // Wait, I meant Plan
  const allPlans = await prisma.plan.findMany();
  console.log("Current Plans in DB:", JSON.stringify(allPlans, null, 2));
  await prisma.$disconnect();
}
check();
