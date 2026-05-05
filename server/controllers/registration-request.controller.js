const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { createOrganizationMembership } = require("../services/organization-member.service");
const { ensureOrganizationId } = require("../services/common.service");
const { assertPermission } = require("../services/access.service");
const { PERMISSION_KEYS } = require("../constants/permissions");
const { validatePasswordComplexity } = require("../utils/validation");
const { assertWithinPlanUserLimit } = require("../services/organization-plan.service");

const GENDER_VALUES = new Set(["MALE", "FEMALE", "OTHER"]);
const ADDRESS_MAX_LENGTH = 191;

const ensureValidRequestId = (requestId) => {
  const parsedId = Number(requestId);
  if (!Number.isFinite(parsedId) || parsedId <= 0) {
    const error = new Error("Invalid registration request id");
    error.statusCode = 400;
    throw error;
  }
  return Math.floor(parsedId);
};

const normalizeAddressField = ({ value, fieldName, required = false }) => {
  const normalized = String(value || "").trim().slice(0, ADDRESS_MAX_LENGTH);
  if (!normalized) {
    if (required) {
      const error = new Error(`${fieldName} is required`);
      error.statusCode = 400;
      throw error;
    }
    return null;
  }
  return normalized;
};

// Helper to check if email already exists in User or a historical RegistrationRequest
const resolveJoinIdentity = async (email, orgId) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    const error = new Error("Valid email is required");
    error.statusCode = 400;
    throw error;
  }
  
  const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (userExists) {
    const error = new Error("An account with this email already exists");
    error.statusCode = 409;
    throw error;
  }

  const existingRequest = await prisma.registrationRequest.findUnique({
    where: {
      orgId_email: {
        orgId,
        email: normalizedEmail,
      },
    },
  });

  return { normalizedEmail, existingRequest };
};

/**
 * @desc    Validate referral code and get organization info
 * @route   GET /api/auth/join/:referralCode
 * @access  Public
 */
exports.validateReferralCode = asyncHandler(async (req, res) => {
  const { referralCode } = req.params;

  const organization = await prisma.organization.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      country: true,
      organizationCode: true,
      isActive: true,
      isBlocked: true,
      deletedAt: true,
    }
  });

  if (!organization || organization.deletedAt || !organization.isActive || organization.isBlocked) {
    res.status(404);
    throw new Error("Invalid or inactive referral link");
  }

  res.status(200).json({
    success: true,
    organization
  });
});

/**
 * @desc    Submit a registration request via referral link
 * @route   POST /api/auth/join/:referralCode
 * @access  Public
 */
exports.submitJoinRequest = asyncHandler(async (req, res) => {
  const { referralCode } = req.params;
  const {
    name,
    email,
    mobile,
    mobileCountryCode,
    password,
    gender,
    city,
    emergencyContact,
    currentAddress,
    permanentAddress,
  } = req.body;

  const organization = await prisma.organization.findUnique({
    where: { referralCode: referralCode.toUpperCase() },
  });

  if (!organization || organization.deletedAt || !organization.isActive || organization.isBlocked) {
    res.status(404);
    throw new Error("Invalid or inactive referral link");
  }

  const trimmedName = String(name || "").trim();
  if (trimmedName.length < 2) {
    res.status(400);
    throw new Error("Name is required");
  }

  const normalizedPassword = String(password || "");
  if (!validatePasswordComplexity(normalizedPassword)) {
    res.status(400);
    throw new Error(
      "Password must be 8-64 characters and include uppercase, lowercase, number, and special character"
    );
  }

  const normalizedGender = String(gender || "").trim().toUpperCase();
  if (normalizedGender && !GENDER_VALUES.has(normalizedGender)) {
    res.status(400);
    throw new Error("Invalid gender value");
  }

  const normalizedCity = String(city || "").trim();
  if (!normalizedCity) {
    res.status(400);
    throw new Error("City is required");
  }
  const normalizedCurrentAddress = normalizeAddressField({
    value: currentAddress,
    fieldName: "Current address",
    required: true,
  });
  const normalizedPermanentAddress = normalizeAddressField({
    value: permanentAddress,
    fieldName: "Permanent address",
    required: true,
  });

  const { normalizedEmail, existingRequest } = await resolveJoinIdentity(email, organization.id);
  const now = new Date();

  if (existingRequest?.status === "APPROVED") {
    res.status(409);
    throw new Error("This registration request has already been approved");
  }

  if (existingRequest?.status === "PENDING" && existingRequest.expiresAt >= now) {
    res.status(409);
    throw new Error("A registration request is already pending for this email");
  }
  
  let normalizedPhone = null;
  let normalizedEmergencyContact = null;
  try {
    normalizedPhone = normalizePhoneNumber({
      phone: mobile,
      countryCode: mobileCountryCode,
      requireCountryCode: true,
    });
    normalizedEmergencyContact = normalizePhoneNumber({
      phone: emergencyContact,
      countryCode: mobileCountryCode,
      requireCountryCode: true,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Invalid contact number");
  }

  const hashedPassword = await bcrypt.hash(normalizedPassword, 10);

  // Set expiry to 30 days
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const request = existingRequest
    ? await prisma.registrationRequest.update({
        where: { id: existingRequest.id },
        data: {
          name: trimmedName,
          mobile: normalizedPhone.e164,
          mobileCountryCode: normalizedPhone.countryCode,
          emergencyContact: normalizedEmergencyContact.e164,
          currentAddress: normalizedCurrentAddress,
          permanentAddress: normalizedPermanentAddress,
          password: hashedPassword,
          gender: normalizedGender || null,
          city: normalizedCity,
          status: "PENDING",
          reviewedById: null,
          reviewedAt: null,
          reviewNote: "",
          expiresAt,
        },
      })
    : await prisma.registrationRequest.create({
        data: {
          orgId: organization.id,
          name: trimmedName,
          email: normalizedEmail,
          mobile: normalizedPhone.e164,
          mobileCountryCode: normalizedPhone.countryCode,
          emergencyContact: normalizedEmergencyContact.e164,
          currentAddress: normalizedCurrentAddress,
          permanentAddress: normalizedPermanentAddress,
          password: hashedPassword,
          gender: normalizedGender || null,
          city: normalizedCity,
          expiresAt,
        },
      });

  res.status(existingRequest ? 200 : 201).json({
    success: true,
    message: existingRequest
      ? "Registration request submitted again. Please wait for admin approval."
      : "Registration request submitted successfully! Please wait for admin approval.",
    requestId: request.id
  });
});

/**
 * @desc    Get all pending registration requests for an organization
 * @route   GET /api/org/registration-requests
 * @access  Private (Admin)
 */
exports.getOrgRegistrationRequests = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_STATUS_UPDATE, orgId);

  const requests = await prisma.registrationRequest.findMany({
    where: {
      orgId,
      status: "PENDING",
      expiresAt: { gte: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  res.status(200).json({
    success: true,
    items: requests
  });
});

/**
 * @desc    Accept a registration request
 * @route   PATCH /api/org/registration-requests/:id/accept
 * @access  Private (Admin)
 */
exports.acceptRegistrationRequest = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE, orgId);

  const requestId = ensureValidRequestId(req.params.id);
  const request = await prisma.registrationRequest.findFirst({
    where: { id: requestId, orgId, status: "PENDING", expiresAt: { gte: new Date() } }
  });

  if (!request) {
    res.status(404);
    throw new Error("Registration request not found, expired, or already processed");
  }

  // Check if email already taken (just in case)
  const userExists = await prisma.user.findUnique({ where: { email: request.email } });
  if (userExists) {
    await prisma.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: Number(req.user.id),
        reviewedAt: new Date(),
        reviewNote: "Email already taken by another user",
      }
    });
    res.status(409);
    throw new Error("Email already registered. Request rejected.");
  }

  await assertWithinPlanUserLimit({ orgId, res });

  // Create User and Membership in transaction
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        orgId: request.orgId,
        name: request.name,
        email: request.email,
        mobile: request.mobile,
        mobileCountryCode: request.mobileCountryCode,
        emergencyContact: request.emergencyContact,
        currentAddress: request.currentAddress,
        permanentAddress: request.permanentAddress,
        password: request.password,
        role: "MEMBER",
        status: "APPROVED",
        isActive: true,
      }
    });

    await createOrganizationMembership(tx, {
      userId: createdUser.id,
      orgId: request.orgId,
      role: "MEMBER",
      isActive: true,
    });

    await tx.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedById: Number(req.user.id),
        reviewedAt: new Date()
      }
    });

    return createdUser;
  });

  res.status(200).json({
    success: true,
    message: "User approved and registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  });
});

/**
 * @desc    Reject a registration request
 * @route   PATCH /api/org/registration-requests/:id/reject
 * @access  Private (Admin)
 */
exports.rejectRegistrationRequest = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  assertPermission(res, req.user, PERMISSION_KEYS.USERS_CREATE, orgId);

  const requestId = ensureValidRequestId(req.params.id);
  const { note } = req.body;

  const request = await prisma.registrationRequest.findFirst({
    where: { id: requestId, orgId, status: "PENDING", expiresAt: { gte: new Date() } }
  });

  if (!request) {
    res.status(404);
    throw new Error("Registration request not found, expired, or already processed");
  }

  // Archive potential user details and mark request as rejected
  await prisma.$transaction(async (tx) => {
    await tx.registrationRequest.update({
      where: { id: requestId },
      data: {
        status: "REJECTED",
        reviewedById: Number(req.user.id),
        reviewedAt: new Date(),
        reviewNote: note || "Rejected by administrator"
      }
    });

    // Create entry in ArchiveUser for record keeping of rejected requests if desired
    // Using the same structure as archiveUser from archive.service
    await tx.archiveUser.create({
      data: {
        orgId: request.orgId,
        name: request.name,
        email: request.email,
        mobile: request.mobile,
        mobileCountryCode: request.mobileCountryCode,
        password: request.password,
        role: "MEMBER",
        status: "REJECTED",
        archiveReason: `Registration request rejected: ${note || "No reason provided"}`,
        archivedAt: new Date(),
        metadata: {
          requestId: request.id,
          rejectedBy: Number(req.user.id),
          emergencyContact: request.emergencyContact || null,
          currentAddress: request.currentAddress || null,
          permanentAddress: request.permanentAddress || null,
        }
      }
    });
  });

  res.status(200).json({
    success: true,
    message: "Registration request rejected and archived"
  });
});
