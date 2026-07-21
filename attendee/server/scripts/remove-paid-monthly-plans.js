require("../config/load-env")();
const prisma = require("../lib/prisma");
const { isLegacyPaidMonthlyPlan } = require("../services/plan.service");

async function removePaidMonthlyPlans() {
  await prisma.$connect();

  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
    },
    include: {
      _count: {
        select: {
          organizations: true,
          subscriptions: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const targetPlans = plans.filter((plan) => isLegacyPaidMonthlyPlan(plan));

  if (targetPlans.length === 0) {
    console.log("No paid 1 month plans found.");
    return;
  }

  let deletedCount = 0;
  let deactivatedCount = 0;

  for (const plan of targetPlans) {
    const hasRelations =
      Number(plan._count?.organizations || 0) > 0 || Number(plan._count?.subscriptions || 0) > 0;

    if (hasRelations) {
      await prisma.plan.update({
        where: { id: plan.id },
        data: { isActive: false },
      });
      deactivatedCount += 1;
      console.log(`Deactivated referenced plan ${plan.code} (${plan.name}).`);
      continue;
    }

    await prisma.plan.delete({
      where: { id: plan.id },
    });
    deletedCount += 1;
    console.log(`Deleted unused plan ${plan.code} (${plan.name}).`);
  }

  console.log(
    `Paid 1 month plan cleanup complete. Deleted: ${deletedCount}, Deactivated: ${deactivatedCount}.`
  );
}

removePaidMonthlyPlans()
  .catch((error) => {
    console.error("Failed to remove paid 1 month plans:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
