const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");

const run = async () => {
  const email = "riteshveagle1@gmail.com";
  const password = "Veagle@123";
  const name = "Ritesh Pote";

  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if user already exists
  let existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    console.log("User already exists. Updating password and role...");
    existingUser = await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        role: "SUPER_ADMIN",
        status: "APPROVED",
        isActive: true,
      }
    });
    console.log("Updated existing user to SUPER_ADMIN");
    return;
  }

  // Create organization
  const org = await prisma.organization.create({
    data: {
      name: "Ritesh's Test Org",
      organizationCode: "RITESHTEST" + Math.floor(Math.random() * 1000),
      referralCode: "RITREF" + Math.floor(Math.random() * 1000),
      email: email,
      phone: "9999999999",
      latitude: 0,
      longitude: 0,
      subscriptionStatus: "ACTIVE",
      isActive: true,
    }
  });

  // Create user
  const user = await prisma.user.create({
    data: {
      name: name,
      email: email,
      mobile: "9999999999",
      mobileCountryCode: "+91",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      orgId: org.id,
      status: "APPROVED",
      isActive: true,
    }
  });

  // Add to org members
  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      orgId: org.id,
      role: "SUPER_ADMIN",
      isActive: true
    }
  });

  // Update org with admin
  await prisma.organization.update({
    where: { id: org.id },
    data: { orgAdminId: user.id }
  });

  console.log("Created Organization:", org.name);
  console.log("Created User:", user.email, "with SUPER_ADMIN access");
};

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
