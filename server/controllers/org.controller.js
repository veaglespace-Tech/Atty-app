const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { generateUniqueOrgCode } = require("../utils/org-code");
const { createOrganizationMembership } = require("../services/organization-member.service");
const {
  truncateText,
} = require("../services/common.service");
const {
  validateEmail,
  validatePersonName,
  validateOrganizationName,
  validatePasswordComplexity,
} = require("../utils/validation");

exports.onboardOrganization = asyncHandler(async (req, res) => {
  const {
    orgName,
    orgEmail,
    orgPhone,
    orgLocation,
    adminName,
    adminEmail,
    adminMobile,
    adminPassword,
  } = req.body;

  if (
    !orgName ||
    !orgEmail ||
    !orgPhone ||
    !orgLocation ||
    !adminName ||
    !adminEmail ||
    !adminMobile ||
    !adminPassword
  ) {
    res.status(400);
    throw new Error("All fields for organization and admin are required");
  }

  if (!validateOrganizationName(orgName)) {
    res.status(400);
    throw new Error("Organization name contains unsupported characters");
  }

  if (!validateEmail(orgEmail)) {
    res.status(400);
    throw new Error("Invalid organization email address");
  }

  if (!validatePersonName(adminName)) {
    res.status(400);
    throw new Error("Admin name can only include letters, spaces, dots, or hyphens");
  }

  if (!validateEmail(adminEmail)) {
    res.status(400);
    throw new Error("Invalid admin email address");
  }

  if (!validatePasswordComplexity(adminPassword)) {
    res.status(400);
    throw new Error(
      "Admin password must be 8-64 characters and include uppercase, lowercase, number, and special character",
    );
  }

  const normalizedOrgEmail = normalizeEmail(orgEmail);
  const normalizedAdminEmail = normalizeEmail(adminEmail);

  let normalizedOrgPhone = null;
  let normalizedAdminPhone = null;
  try {
    normalizedOrgPhone = normalizePhoneNumber({
      phone: orgPhone,
      countryCode: req.body?.orgPhoneCountryCode || req.body?.countryCode,
      requireCountryCode: true,
    });
    normalizedAdminPhone = normalizePhoneNumber({
      phone: adminMobile,
      countryCode: req.body?.adminMobileCountryCode || req.body?.countryCode,
      requireCountryCode: true,
    });
  } catch (phoneError) {
    res.status(400);
    throw new Error(phoneError.message || "Invalid phone number format");
  }

  const [userExists, organizationExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: normalizedAdminEmail } }),
    prisma.organization.findUnique({ where: { email: normalizedOrgEmail } }),
  ]);

  if (userExists) {
    res.status(400);
    throw new Error("Admin email already registered");
  }

  if (organizationExists) {
    res.status(400);
    throw new Error("Organization email already registered");
  }

  const longitude = Number(orgLocation[0]);
  const latitude = Number(orgLocation[1]);
  const organizationCode = await generateUniqueOrgCode(prisma);

  const organization = await prisma.organization.create({
    data: {
      name: truncateText(orgName, 120),
      organizationCode,
      email: normalizedOrgEmail,
      phone: normalizedOrgPhone.e164,
      phoneCountryCode: normalizedOrgPhone.countryCode,
      longitude: Number.isFinite(longitude) ? longitude : 0,
      latitude: Number.isFinite(latitude) ? latitude : 0,
      isActive: true,
    },
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminRole = normalizeRole("ORG_ADMIN");

  const adminUser = await prisma.user.create({
    data: {
      name: truncateText(adminName, 120),
      email: normalizedAdminEmail,
      mobile: normalizedAdminPhone.e164,
      mobileCountryCode: normalizedAdminPhone.countryCode,
      password: hashedPassword,
      role: adminRole,
      orgId: organization.id,
      status: "APPROVED",
      isActive: true,
    },
  });

  await createOrganizationMembership(prisma, {
    userId: adminUser.id,
    orgId: organization.id,
    role: adminRole,
    isActive: true,
  });

  await prisma.organization.update({
    where: { id: organization.id },
    data: { orgAdminId: adminUser.id },
  });

  res.status(201).json({
    success: true,
    message: "Organization and Admin created successfully",
    data: {
      organization,
      adminUser: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminRole,
      },
    },
  });
});
