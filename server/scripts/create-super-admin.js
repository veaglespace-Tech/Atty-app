const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { resolveUserPermissions } = require("../constants/permissions");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");

const run = async () => {
  const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
  const email = normalizeEmail(process.env.SUPER_ADMIN_EMAIL || "superadmin@veagle.com");
  const password = process.env.SUPER_ADMIN_PASSWORD || "password123";
  const mobileCountryCode = process.env.SUPER_ADMIN_COUNTRY_CODE || "+91";
  const mobileRaw = process.env.SUPER_ADMIN_MOBILE || "9999999999";

  if (!email || !password) {
    throw new Error("Super Admin Email and Password are required");
  }

  const mobile = normalizePhoneNumber({
    phone: mobileRaw,
    countryCode: mobileCountryCode,
    requireCountryCode: true,
  });

  const role = normalizeRole("SUPER_ADMIN");
  const hashedPassword = await bcrypt.hash(password, 10);
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  const existingByRole = existingByEmail
    ? null
    : await prisma.user.findFirst({
        where: { role },
        orderBy: { id: "asc" },
      });
  const existing = existingByEmail || existingByRole;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        orgId: null,
        status: "APPROVED",
        isActive: true,
        deletedAt: null,
        mobile: mobile.e164,
        mobileCountryCode: mobile.countryCode,
        permissions: resolveUserPermissions(role),
      },
    });

    console.log(`Updated existing super admin: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      mobile: mobile.e164,
      mobileCountryCode: mobile.countryCode,
      role,
      permissions: resolveUserPermissions(role),
      status: "APPROVED",
      isActive: true,
    },
  });

  console.log(`Created super admin: ${email}`);
};

run()
  .catch((error) => {
    console.error("Failed to create super admin:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
