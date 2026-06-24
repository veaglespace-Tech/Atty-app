const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: {
      name: "Veagle Attendee HQ",
      organizationCode: "VEAGLE",
      referralCode: "REF-VEAGLE",
      email: "riteshpote0603@gmail.com",
      phone: "+919999999999",
      latitude: 18.5204,
      longitude: 73.8567
    }
  });
  console.log("Created Org:", org.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
