const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { upsertOrganizationMembership } = require("../services/organization-member.service");

const resolveTargetOrganization = async () => {
  const explicitOrgId = Number(process.env.SUPER_ADMIN_ORG_ID || 0);

  if (Number.isFinite(explicitOrgId) && explicitOrgId > 0) {
    const organization = await prisma.organization.findFirst({
      where: {
        id: explicitOrgId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        organizationCode: true,
      },
    });

    if (!organization) {
      throw new Error(`Organization ${explicitOrgId} was not found for SUPER_ADMIN_ORG_ID`);
    }

    return organization;
  }

  const fallbackOrganization = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
    },
    orderBy: {
      id: "asc",
    },
    select: {
      id: true,
      name: true,
      organizationCode: true,
    },
  });

  if (!fallbackOrganization) {
    throw new Error(
      "No organization exists yet. Create one first or set SUPER_ADMIN_ORG_ID to attach the super admin membership."
    );
  }

  return fallbackOrganization;
};

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
  const targetOrganization = await resolveTargetOrganization();
  const existingByEmail = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: true,
    },
  });
  const existingByRoleMembership = existingByEmail
    ? null
    : await prisma.organizationMember.findFirst({
        where: {
          role,
        },
        include: {
          user: {
            include: {
              memberships: true,
            },
          },
        },
        orderBy: { id: "asc" },
      });
  const existing = existingByEmail || existingByRoleMembership?.user || null;

  await prisma.$transaction(async (tx) => {
    let userId = existing?.id || null;

    if (existing) {
      await tx.user.update({
        where: { id: existing.id },
        data: {
          name,
          email,
          password: hashedPassword,
          orgId: targetOrganization.id,
          status: "APPROVED",
          isActive: true,
          deletedAt: null,
          mobile: mobile.e164,
          mobileCountryCode: mobile.countryCode,
        },
      });
    } else {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          mobile: mobile.e164,
          mobileCountryCode: mobile.countryCode,
          orgId: targetOrganization.id,
          status: "APPROVED",
          isActive: true,
        },
      });

      userId = createdUser.id;
    }

    await upsertOrganizationMembership(tx, {
      userId,
      orgId: targetOrganization.id,
      role,
      isActive: true,
    });
  });

  console.log(
    `${existing ? "Updated" : "Created"} super admin: ${email} (org ${targetOrganization.organizationCode || targetOrganization.id})`
  );
};

run()
  .catch((error) => {
    console.error("Failed to create super admin:", error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
