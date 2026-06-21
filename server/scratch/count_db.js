const prisma = require("../lib/prisma");

async function main() {
  try {
    console.log("--- DATABASE STATE ---");
    const plansCount = await prisma.plan.count();
    console.log("Total plans:", plansCount);

    const plans = await prisma.plan.findMany();
    console.log("Plans listed:", plans.map(p => ({ id: p.id, name: p.name, code: p.code, price: p.price })));

    const orgsCount = await prisma.organization.count();
    console.log("Total organizations:", orgsCount);

    const usersCount = await prisma.user.count();
    console.log("Total users:", usersCount);

    const claimsCount = await prisma.freeTrialClaim.count();
    console.log("Total free trial claims:", claimsCount);

    const claims = await prisma.freeTrialClaim.findMany();
    console.log("Claims listed:", claims);
  } catch (err) {
    console.error("Failed to query DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
