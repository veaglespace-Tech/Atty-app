const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgs = await prisma.organization.findMany({
    where: {
      subscriptionStatus: { in: ['ACTIVE', 'TRIAL'] },
      OR: [
        { subscriptionExpiry: null },
        { subscriptionExpiry: { gt: new Date() } }
      ],
      orgAdminId: { not: null }
    },
    include: {
      orgAdmin: true
    },
    take: 5
  });

  if (orgs.length > 0) {
    console.log(JSON.stringify(orgs.map(org => ({
      orgName: org.name,
      orgCode: org.organizationCode,
      status: org.subscriptionStatus,
      expiry: org.subscriptionExpiry,
      adminEmail: org.orgAdmin.email,
      adminMobile: org.orgAdmin.mobile,
      adminPasswordHash: org.orgAdmin.password,
      adminRole: org.orgAdmin.role
    })), null, 2));
  } else {
    console.log("No active admin found");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
