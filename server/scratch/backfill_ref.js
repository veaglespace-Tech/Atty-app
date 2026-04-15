const { PrismaClient } = require("@prisma/client");
const { generateUniqueReferralCode } = require("../utils/referral-code");
const prisma = new PrismaClient();

async function backfill() {
  const orgs = await prisma.organization.findMany({
    where: { referralCode: null },
  });

  console.log(`Found ${orgs.length} organizations to backfill.`);

  for (const org of orgs) {
    const code = await generateUniqueReferralCode(prisma);
    await prisma.organization.update({
      where: { id: org.id },
      data: { referralCode: code },
    });
    console.log(`Assigned ${code} to ${org.name}`);
  }

  console.log("Done.");
}

backfill()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
