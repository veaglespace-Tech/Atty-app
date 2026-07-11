const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        subscriptionStatus: 'ACTIVE',
        subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // +30 days
      }
    });
    
    if (org.subscriptionId) {
      await prisma.subscription.update({
        where: { id: org.subscriptionId },
        data: {
          status: 'ACTIVE',
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });
    }
  }
  console.log("Subscriptions extended by 30 days!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
