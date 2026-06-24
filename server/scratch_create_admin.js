const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const email = "veaglespaceritesh@gmail.com";
  const password = "Veagle@123";
  const hashedPassword = await bcrypt.hash(password, 10);
  const role = "ORG_ADMIN";
  
  const org = await prisma.organization.create({
    data: {
      name: "Veagle Space Org",
      organizationCode: "V-SPACE2",
      referralCode: "REF-VSPACE2",
      email: "org2@veaglespace.com",
      phone: "+918888888888",
      latitude: 18.5204,
      longitude: 73.8567
    }
  });

  // Create User
  const user = await prisma.user.create({
    data: {
      name: "Ritesh Admin",
      email: email,
      password: hashedPassword,
      mobile: "+918888888888",
      mobileCountryCode: "+91",
      role: role,
      orgId: org.id,
      status: "APPROVED",
      isActive: true
    }
  });

  // Create Membership
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: role,
      isActive: true
    }
  });

  console.log(`Created Organization: ${org.name}`);
  console.log(`Created Admin User: ${user.email} with role ${role}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
