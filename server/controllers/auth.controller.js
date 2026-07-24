const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole, getDashboardPathByRole } = require("../constants/rbac");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { normalizeUser } = require("../utils/identity");
const { CLIENT_BASE_URL } = require('../config');
const {
  resolveOrganizationId,
  resolveUserRole,
} = require("../utils/membership");
const { resolveUserPermissions } = require("../constants/permissions");
const { createOrganizationMembership } = require("../services/organization-member.service");
const { truncateText } = require("../services/common.service");
const { syncOrganizationSubscriptionState } = require("../services/subscription.service");
const { deleteProfileImage, uploadProfileImage } = require("../services/profile-image.service");
const sendEmail = require("../utils/email");
const { buildEmailTemplate } = require("../utils/email-template");
const {
  validateEmail,
  validatePersonName,
  validatePasswordComplexity,
} = require("../utils/validation");

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = PASSWORD_RESET_TOKEN_TTL_MINUTES * 60;
const DEFAULT_SESSION_TOKEN_TTL_HOURS = 24;
const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const SESSION_TOKEN_TTL_HOURS = parsePositiveInteger(
  process.env.SESSION_TOKEN_TTL_HOURS,
  DEFAULT_SESSION_TOKEN_TTL_HOURS
);
const SESSION_TOKEN_TTL_SECONDS = SESSION_TOKEN_TTL_HOURS * 60 * 60;
const SESSION_TOKEN_TTL_MS = SESSION_TOKEN_TTL_SECONDS * 1000;
const GENERIC_PASSWORD_RESET_MESSAGE =
  "If this account exists, we have sent a reset link to the registered email address.";
const PENDING_APPROVAL_LOGIN_MESSAGE =
  "Your registration request is pending admin approval. You can sign in after your organization admin approves it.";
const REJECTED_APPROVAL_LOGIN_MESSAGE =
  "Your registration request was rejected by the organization admin. Please contact your administrator.";
const EXPIRED_APPROVAL_LOGIN_MESSAGE =
  "Your registration request has expired. Please submit a new join request or contact your administrator.";

const getSessionCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : SESSION_TOKEN_TTL_MS,
  path: "/",
});

const getSessionCookieClearOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/",
});

const getClientBaseUrl = () => {
  const explicitBaseUrl = String(process.env.CLIENT_URL || process.env.APP_URL || "").trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const firstAllowedOrigin = String(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .find(Boolean);

  if (firstAllowedOrigin) {
    return firstAllowedOrigin.replace(/\/+$/, "");
  }

  return CLIENT_BASE_URL;
};

const getLoginPathByRole = (role) =>
  normalizeRole(role) === "SUPER_ADMIN" ? "/super-admin/login" : "/login";

const formatRoleLabel = (role) =>
  normalizeRole(role)
    .split("_")
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(" ");

const maskEmailAddress = (value) => {
  const normalized = normalizeEmail(value);
  const [name = "", domain = ""] = normalized.split("@");
  if (!name || !domain) return "";

  const [domainName = "", ...domainSuffixParts] = domain.split(".");
  const maskedName =
    name.length <= 2 ? `${name.charAt(0)}*` : `${name.slice(0, 2)}${"*".repeat(name.length - 2)}`;
  const maskedDomain = domainName
    ? `${domainName.charAt(0)}${"*".repeat(Math.max(1, domainName.length - 1))}`
    : "";
  const suffix = domainSuffixParts.length > 0 ? `.${domainSuffixParts.join(".")}` : "";

  return `${maskedName}@${maskedDomain}${suffix}`;
};

const buildPasswordResetSecret = (user) =>
  `${String(process.env.JWT_KEY || "")}:${String(user?.password || "")}`;

const createPasswordResetToken = (user) =>
  jwt.sign(
    {
      id: Number(user.id),
      purpose: "PASSWORD_RESET",
    },
    buildPasswordResetSecret(user),
    {
      expiresIn: PASSWORD_RESET_TOKEN_TTL_SECONDS,
    }
  );

const decodePasswordResetToken = (token) => {
  const decoded = jwt.decode(String(token || ""));
  if (!decoded || typeof decoded !== "object") return null;

  const userId = Number(decoded.id);
  if (!Number.isFinite(userId) || userId <= 0 || decoded.purpose !== "PASSWORD_RESET") {
    return null;
  }

  return { userId };
};

const validatePasswordResetToken = async (token) => {
  const decoded = decodePasswordResetToken(token);
  if (!decoded) return null;

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: authUserInclude,
  });

  if (!user || user.deletedAt || user.isActive === false) {
    return null;
  }

  try {
    const verified = jwt.verify(String(token || ""), buildPasswordResetSecret(user));
    if (!verified || typeof verified !== "object" || verified.purpose !== "PASSWORD_RESET") {
      return null;
    }
  } catch (_) {
    return null;
  }

  return user;
};

const findPasswordResetUser = async ({
  email,
  loginAs,
  organizationId,
  organizationCode,
}) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: authUserInclude,
  });

  if (!user) return null;

  if (user.deletedAt || user.isActive === false) {
    return null;
  }

  try {
    const { membership, organization, role } = resolveAuthMembership({
      user,
      loginAs,
      organizationId,
      organizationCode,
    });

    return {
      ...user,
      orgId: organization?.id || user.orgId || null,
      organization: organization || null,
      memberships: user.memberships,
      currentMembership: membership || null,
      currentRole: role,
    };
  } catch (_) {
    return null;
  }
};

const sendPasswordResetEmail = async ({ user, token }) => {
  const resetUrl = `${getClientBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const resolvedRole = resolveUserRole(user, resolveOrganizationId(user)) || "MEMBER";
  const roleLabel = formatRoleLabel(resolvedRole);
  const loginPath = getLoginPathByRole(resolvedRole);
  const loginUrl = `${getClientBaseUrl()}${loginPath}`;
  const organizationSummary =
    user.organization && !user.organization.deletedAt
      ? [user.organization.name, user.organization.organizationCode]
          .filter(Boolean)
          .join(" - ")
      : "Platform account";
  const subject = "Reset your Veagle Attendee password";
  const message = `Hello ${user.name},

We received a request to reset your Veagle Attendee password for your ${roleLabel} account.

Account details:
- Email: ${user.email}
- Role: ${roleLabel}
- Workspace: ${organizationSummary}

Open this link to set a new password:
${resetUrl}

This link will expire in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes and can only be used once after your password changes.

After you save the new password, the previous password will stop working immediately.

Login page:
${loginUrl}

If you did not request this, you can ignore this email.`;
  const html = buildEmailTemplate({
    eyebrow: "Password Reset",
    title: "Reset your Veagle Attendee password",
    subtitle: "Secure access recovery for your workspace account.",
    greeting: `Hello ${user.name || "there"}`,
    intro: [`We received a request to reset the password for your ${roleLabel} account.`],
    sections: [
      {
        eyebrow: "Account Details",
        title: "Review the account before changing the password",
        rows: [
          { label: "Email", value: user.email || "-" },
          { label: "Role", value: roleLabel },
          { label: "Workspace", value: organizationSummary },
        ],
      },
    ],
    action: {
      label: "Reset Password",
      href: resetUrl,
    },
    secondaryLinks: [
      {
        label: "If the button does not open, use this reset link:",
        href: resetUrl,
      },
      {
        label: "Sign-in page:",
        href: loginUrl,
      },
    ],
    footnotes: [
      `This link expires in ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes and becomes invalid after your password changes.`,
      "After you save a new password, your previous password will stop working immediately.",
      "If you did not request this, you can safely ignore this email.",
    ],
    footerNote: "Secure attendance access for every role and workspace.",
  });

  return sendEmail({
    email: user.email,
    subject,
    message,
    html,
  });
};

const parseOrganizationId = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

const parseSearchLimit = (value, fallback = 8, max = 12) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.max(1, Math.floor(parsed)));
};

const normalizeAddressField = ({
  value,
  fieldName,
  required = false,
  maxLength = 191,
}) => {
  const normalized = truncateText(value, maxLength);
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

const normalizeEmergencyContact = ({
  emergencyContact,
  countryCode,
  required = false,
}) => {
  const rawEmergencyContact = String(emergencyContact || "").trim();
  if (!rawEmergencyContact) {
    if (required) {
      const error = new Error("Emergency contact is required");
      error.statusCode = 400;
      throw error;
    }
    return null;
  }

  try {
    const normalized = normalizePhoneNumber({
      phone: rawEmergencyContact,
      countryCode,
      requireCountryCode: true,
    });
    return normalized.e164;
  } catch (error) {
    const phoneError = new Error(error.message || "Invalid emergency contact number");
    phoneError.statusCode = 400;
    throw phoneError;
  }
};

const normalizeOrganizationText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const buildOrganizationSearchTerms = (value) => {
  const trimmedValue = String(value || "").trim();
  if (trimmedValue.length < 2) return [];

  const terms = new Set([trimmedValue]);
  const tokens = trimmedValue
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  tokens.forEach((token) => {
    const lowerToken = token.toLowerCase();
    const variants = [token];

    if (lowerToken.length >= 5 && lowerToken.endsWith("ies")) {
      variants.push(token.slice(0, -3));
    }

    if (lowerToken.length >= 5 && lowerToken.endsWith("y")) {
      variants.push(token.slice(0, -1));
    }

    if (lowerToken.length >= 5 && lowerToken.endsWith("es")) {
      variants.push(token.slice(0, -2));
    }

    if (lowerToken.length >= 4 && lowerToken.endsWith("s")) {
      variants.push(token.slice(0, -1));
    }

    variants
      .map((variant) => variant.trim())
      .filter((variant) => variant.length >= 2)
      .forEach((variant) => terms.add(variant));
  });

  return Array.from(terms);
};

const buildOrganizationSearchWhere = ({ query, activeOnly = true }) => {
  const terms = buildOrganizationSearchTerms(query);
  if (terms.length === 0) return null;

  const where = {
    deletedAt: null,
    OR: terms.flatMap((term) => [
      { name: { contains: term } },
      { organizationCode: { contains: term } },
      { city: { contains: term } },
      { state: { contains: term } },
      { country: { contains: term } },
    ]),
  };

  if (activeOnly) {
    where.isActive = true;
    where.isBlocked = false;
  }

  return where;
};

const organizationMatchesQuery = (organization, query) => {
  if (!organization) return false;

  const normalizedQuery = normalizeOrganizationText(query);
  if (!normalizedQuery) return false;

  const searchableFields = [
    organization.name,
    organization.organizationCode,
    organization.city,
    organization.state,
    organization.country,
  ]
    .map(normalizeOrganizationText)
    .filter(Boolean);

  if (
    searchableFields.some(
      (fieldValue) => fieldValue === normalizedQuery || fieldValue.includes(normalizedQuery)
    )
  ) {
    return true;
  }

  const longTerms = buildOrganizationSearchTerms(query)
    .map(normalizeOrganizationText)
    .filter((term) => term.length >= 4);

  if (longTerms.length === 0) {
    return false;
  }

  const matchedTerms = longTerms.filter((term) =>
    searchableFields.some((fieldValue) => fieldValue.includes(term))
  );

  return matchedTerms.length >= Math.max(1, Math.ceil(longTerms.length * 0.6));
};

const organizationLookupSelect = {
  id: true,
  name: true,
  organizationCode: true,
  city: true,
  state: true,
  country: true,
  isActive: true,
  isBlocked: true,
  deletedAt: true,
  plan: {
    select: {
      id: true,
      name: true,
      code: true,
      memberLimit: true,
      maxUsers: true,
    },
  },
};

const organizationSearchSelect = {
  id: true,
  name: true,
  organizationCode: true,
  city: true,
  state: true,
  country: true,
};

const resolveRequestedOrganization = async ({
  organizationId,
  organizationCode,
  referralCode,
}) => {
  const requestedOrganizationId = parseOrganizationId(organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();
  const normalizedReferralCode = String(referralCode || "").trim().toUpperCase();

  if (normalizedReferralCode) {
    return prisma.organization.findFirst({
      where: {
        referralCode: normalizedReferralCode,
        deletedAt: null,
      },
      select: organizationLookupSelect,
    });
  }

  if (requestedOrganizationId) {
    return prisma.organization.findFirst({
      where: {
        id: requestedOrganizationId,
        deletedAt: null,
      },
      select: organizationLookupSelect,
    });
  }

  if (normalizedOrganizationCode) {
    return prisma.organization.findFirst({
      where: {
        organizationCode: normalizedOrganizationCode,
        deletedAt: null,
      },
      select: organizationLookupSelect,
    });
  }

  return null;
};

const authUserInclude = {
  organization: {
    include: {
      plan: true,
    },
  },
  memberships: {
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
  },
};

const authUserWriteInclude = {
  organization: {
    include: {
      plan: true,
    },
  },
};

const mergeSessionUserState = ({ previousUser, nextUser, organization = null }) => {
  const resolvedOrganization =
    organization ||
    (nextUser?.organization && typeof nextUser.organization === "object"
      ? nextUser.organization
      : null) ||
    (previousUser?.organization && typeof previousUser.organization === "object"
      ? previousUser.organization
      : null) ||
    null;

  return {
    ...(previousUser && typeof previousUser === "object" ? previousUser : {}),
    ...(nextUser && typeof nextUser === "object" ? nextUser : {}),
    organization: resolvedOrganization,
    memberships: Array.isArray(nextUser?.memberships)
      ? nextUser.memberships
      : Array.isArray(previousUser?.memberships)
        ? previousUser.memberships
        : [],
  };
};

const buildLegacyAuthMembership = (user) => {
  const normalizedRole = normalizeRole(user?.role);
  if (!normalizedRole) return null;

  if (normalizedRole === "SUPER_ADMIN") {
    return {
      orgId: null,
      role: "SUPER_ADMIN",
      isActive: user?.isActive !== false,
      organization: null,
    };
  }

  const organization =
    user?.organization && typeof user.organization === "object" ? user.organization : null;
  const resolvedOrgId = parseOrganizationId(organization?.id || user?.orgId || user?.organizationId);

  if (!organization || !resolvedOrgId) {
    return null;
  }

  return {
    orgId: resolvedOrgId,
    role: normalizedRole,
    isActive: user?.isActive !== false,
    organization,
  };
};

const findSuperAdminMembership = (user) =>
  (Array.isArray(user?.memberships) ? user.memberships : []).find(
    (membership) =>
      normalizeRole(membership?.role) === "SUPER_ADMIN" && membership?.isActive !== false
  ) ||
  (buildLegacyAuthMembership(user)?.role === "SUPER_ADMIN" ? buildLegacyAuthMembership(user) : null);

const findOrganizationMembership = ({
  user,
  organizationId,
  organizationCode,
  organizationName,
}) => {
  const matchingMembership =
    (Array.isArray(user?.memberships) ? user.memberships : []).find((membership) => {
      const org = membership?.organization;
      if (!org || org.deletedAt) return false;
      if (membership?.isActive === false) return false;
      if (organizationId && Number(org.id) !== Number(organizationId)) return false;
      if (
        organizationCode &&
        String(org.organizationCode || "").trim().toUpperCase() !== String(organizationCode)
      ) {
        return false;
      }
      if (organizationName && !organizationMatchesQuery(org, organizationName)) return false;
      return true;
    }) || null;

  if (matchingMembership) {
    return matchingMembership;
  }

  const legacyMembership = buildLegacyAuthMembership(user);
  const org = legacyMembership?.organization;

  if (!legacyMembership || !org || legacyMembership.isActive === false || org.deletedAt) {
    return null;
  }

  if (organizationId && Number(org.id) !== Number(organizationId)) return null;
  if (
    organizationCode &&
    String(org.organizationCode || "").trim().toUpperCase() !== String(organizationCode)
  ) {
    return null;
  }
  if (organizationName && !organizationMatchesQuery(org, organizationName)) return null;

  return legacyMembership;
};

const listActiveOrganizationMemberships = (user) => {
  const activeMemberships = (Array.isArray(user?.memberships) ? user.memberships : []).filter(
    (membership) => {
      const org = membership?.organization;
      if (!org || org.deletedAt) return false;
      if (membership?.isActive === false) return false;
      if (normalizeRole(membership?.role) === "SUPER_ADMIN") return false;
      return true;
    }
  );

  if (activeMemberships.length > 0) {
    return activeMemberships;
  }

  const legacyMembership = buildLegacyAuthMembership(user);
  const org = legacyMembership?.organization;
  if (!legacyMembership || !org || legacyMembership.isActive === false || org.deletedAt) {
    return [];
  }
  if (normalizeRole(legacyMembership.role) === "SUPER_ADMIN") {
    return [];
  }

  return [legacyMembership];
};

const resolveAuthMembership = ({
  user,
  loginAs,
  organizationId,
  organizationCode,
  organizationName,
}) => {
  const requestedRole = loginAs ? normalizeRole(loginAs) : null;
  const normalizedOrganizationId = parseOrganizationId(organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();
  const normalizedOrganizationName = String(organizationName || "").trim();
  const superAdminMembership = findSuperAdminMembership(user);

  if (
    requestedRole === "SUPER_ADMIN" ||
    (!normalizedOrganizationId &&
      !normalizedOrganizationCode &&
      !normalizedOrganizationName &&
      superAdminMembership)
  ) {
    if (!superAdminMembership) {
      const error = new Error("Selected role (SUPER_ADMIN) does not match this account");
      error.statusCode = 401;
      throw error;
    }

    return {
      membership: superAdminMembership,
      organization: superAdminMembership.organization || null,
      role: "SUPER_ADMIN",
    };
  }

  if (!normalizedOrganizationId && !normalizedOrganizationCode && !normalizedOrganizationName) {
    const candidateMemberships = listActiveOrganizationMemberships(user);
    const roleMatchedMemberships = requestedRole
      ? candidateMemberships.filter(
          (membership) => normalizeRole(membership?.role) === normalizeRole(requestedRole)
        )
      : candidateMemberships;

    if (roleMatchedMemberships.length === 1) {
      const membership = roleMatchedMemberships[0];
      const membershipRole = normalizeRole(membership.role);

      return {
        membership,
        organization: membership.organization || null,
        role: membershipRole,
      };
    }

    if (roleMatchedMemberships.length === 0) {
      const error = requestedRole
        ? new Error(`Selected role (${requestedRole}) does not match this account`)
        : new Error("No active organization membership found for this account");
      error.statusCode = 401;
      throw error;
    }

    const error = new Error(
      "Multiple organizations are linked to this account. Please contact your administrator."
    );
    error.statusCode = 409;
    throw error;
  }

  const membership = findOrganizationMembership({
    user,
    organizationId: normalizedOrganizationId,
    organizationCode: normalizedOrganizationCode,
    organizationName: normalizedOrganizationName,
  });

  if (!membership) {
    const error = new Error("Selected organization does not match this user");
    error.statusCode = 401;
    throw error;
  }

  const membershipRole = normalizeRole(membership.role);
  if (requestedRole && requestedRole !== membershipRole) {
    const error = new Error(`Selected role (${requestedRole}) does not match this account`);
    error.statusCode = 401;
    throw error;
  }

  return {
    membership,
    organization: membership.organization || null,
    role: membershipRole,
  };
};

const getRegistrationRequestLoginBlockMessage = (registrationRequest) => {
  if (!registrationRequest) return null;

  const status = String(registrationRequest.status || "").trim().toUpperCase();
  const expiresAt = registrationRequest.expiresAt
    ? new Date(registrationRequest.expiresAt)
    : null;
  const isExpired = expiresAt instanceof Date && !Number.isNaN(expiresAt.getTime()) && expiresAt < new Date();

  if (status === "PENDING") {
    return isExpired ? EXPIRED_APPROVAL_LOGIN_MESSAGE : PENDING_APPROVAL_LOGIN_MESSAGE;
  }

  if (status === "REJECTED") {
    return REJECTED_APPROVAL_LOGIN_MESSAGE;
  }

  return null;
};

const findRegistrationRequestLoginBlockMessage = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password) return null;

  const registrationRequests = await prisma.registrationRequest.findMany({
    where: {
      email: normalizedEmail,
      status: {
        in: ["PENDING", "REJECTED"],
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 5,
  });

  if (!Array.isArray(registrationRequests) || registrationRequests.length === 0) {
    return null;
  }

  const inputPassword = String(password || "");
  const trimmedPassword = inputPassword.trim();
  const candidatePasswords = [inputPassword];
  if (trimmedPassword && trimmedPassword !== inputPassword) {
    candidatePasswords.push(trimmedPassword);
  }

  for (const request of registrationRequests) {
    if (!request?.password) continue;
    const passwordChecks = await Promise.all(
      candidatePasswords.map((candidate) => bcrypt.compare(candidate, request.password))
    );
    if (passwordChecks.some(Boolean)) {
      return getRegistrationRequestLoginBlockMessage(request);
    }
  }

  return null;
};

const serializeSessionUser = (user, organization = null) => {
  if (!user) return null;

  const org = organization || user.organization || null;
  const normalized = normalizeUser(user, org);

  return {
    id: normalized.id,
    _id: normalized.id,
    name: normalized.name,
    email: normalized.email,
    mobile: normalized.mobile,
    mobileCountryCode: normalized.mobileCountryCode || null,
    emergencyContact: normalized.emergencyContact || null,
    currentAddress: normalized.currentAddress || null,
    permanentAddress: normalized.permanentAddress || null,
    bloodGroup: normalized.bloodGroup || null,
    profileImageUrl: normalized.profileImageUrl || null,
    memberships: normalized.memberships.map((membership) => ({
      orgId: membership.orgId,
      role: membership.role,
      isActive: membership.isActive !== false,
    })),
    currentMembership: normalized.currentMembership
      ? {
          orgId: normalized.currentMembership.orgId,
          role: normalized.currentMembership.role,
          isActive: normalized.currentMembership.isActive !== false,
        }
      : null,
    currentRole: normalized.currentRole || null,
    permissions: Array.isArray(normalized.permissions) 
      ? normalized.permissions 
      : resolveUserPermissions(normalized, normalized.currentMembership?.orgId),
    status: normalized.status,
    isActive: normalized.isActive !== false,
    organizationId: normalized.organizationId || null,
    organizationCode: org?.organizationCode || null,
    city: org?.city || null,
    organization: org
      ? {
          id: org.id,
          name: org.name,
          organizationCode: org.organizationCode,
          referralCode: org.referralCode || null,
          city: org.city || null,
          state: org.state || null,
          country: org.country || null,
          subscriptionStatus: org.subscriptionStatus || null,
          logoUrl: org.logoUrl || null,
          plan: org.plan
            ? {
                id: org.plan.id,
                name: org.plan.name,
                code: org.plan.code,
                memberLimit: org.plan.memberLimit || 0,
                maxUsers: org.plan.maxUsers || 0,
              }
            : null,
        }
      : null,
    dashboardPath: getDashboardPathByRole(normalized.currentRole),
  };
};

exports.register = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const { org, admin, plan, organizationCode, referralCode, ...userData } = input;
  const requestedOrganizationId = parseOrganizationId(input?.organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();
  const normalizedReferralCode = String(referralCode || "").trim().toUpperCase();
  const requestedRole = normalizeRole(userData.role || input.role || "MEMBER");

  // SCENARIO 1: ORGANISATION ONBOARDING
  // DISABLED: Organisations must now register via the Payment flow (/api/payment/verify-and-register)
  if (org && admin && plan) {
    res.status(400);
    throw new Error("Use /api/payment/verify-and-register for organization onboarding");
  }

  if (requestedRole === "MEMBER" && !normalizedReferralCode) {
    res.status(400);
    throw new Error("Referral code is required for member registration");
  }

  if (requestedRole === "MEMBER" && (requestedOrganizationId || normalizedOrganizationCode)) {
    res.status(400);
    throw new Error("Organization selection is not supported for member registration. Use referral code.");
  }

  // SCENARIO 2: MEMBER JOINING (organization selection or referral code present)
  if (requestedOrganizationId || normalizedOrganizationCode || normalizedReferralCode) {
    if (!userData.name || !userData.email || !userData.mobile || !userData.password) {
      res.status(400);
      throw new Error("Please provide name, email, mobile and password");
    }

    if (!validatePersonName(userData.name)) {
      res.status(400);
      throw new Error("Full name can only include letters, spaces, dots, or hyphens");
    }

    const emailValidation = await validateEmail(userData.email);
    if (!emailValidation.valid) {
      res.status(400);
      throw new Error(emailValidation.error);
    }

    if (!validatePasswordComplexity(userData.password)) {
      res.status(400);
      throw new Error(
        "Password must be 8-64 characters and include uppercase, lowercase, number, and special character",
      );
    }

    const normalizedEmail = normalizeEmail(userData.email);
    const normalizedPhone = normalizePhoneNumber({
      phone: userData.mobile,
      countryCode: userData.mobileCountryCode || userData.countryCode,
      requireCountryCode: true,
    });

    const targetOrg = await resolveRequestedOrganization({
      organizationId: requestedOrganizationId,
      organizationCode: normalizedOrganizationCode,
      referralCode: normalizedReferralCode,
    });

    if (!targetOrg) {
      res.status(404);
      throw new Error("Selected organization was not found");
    }

    if (targetOrg.isBlocked || targetOrg.isActive === false || targetOrg.deletedAt) {
      res.status(403);
      throw new Error("This organization is not available for new registrations");
    }

    // Limit check removed for public registration:
    // Public registrations always create users with status="PENDING".
    // We now allow unlimited PENDING users so admins can approve them later
    // up to the organization's plan limit.

    const userExists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    const normalizedRole = normalizeRole(userData.role || "MEMBER");
    const requiresMemberDetails = normalizedRole === "MEMBER";
    const normalizedEmergencyContact = normalizeEmergencyContact({
      emergencyContact: userData.emergencyContact,
      countryCode: userData.mobileCountryCode || userData.countryCode,
      required: requiresMemberDetails,
    });
    const normalizedCurrentAddress = normalizeAddressField({
      value: userData.currentAddress,
      fieldName: "Current address",
      required: requiresMemberDetails,
    });
    const normalizedPermanentAddress = normalizeAddressField({
      value: userData.permanentAddress,
      fieldName: "Permanent address",
      required: requiresMemberDetails,
    });

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: String(userData.name).trim(),
          email: normalizedEmail,
          mobile: normalizedPhone.e164,
          mobileCountryCode: normalizedPhone.countryCode,
          ...(normalizedEmergencyContact
            ? { emergencyContact: normalizedEmergencyContact }
            : {}),
          ...(normalizedCurrentAddress ? { currentAddress: normalizedCurrentAddress } : {}),
          ...(normalizedPermanentAddress ? { permanentAddress: normalizedPermanentAddress } : {}),
          password: hashedPassword,
          role: normalizedRole,
          orgId: targetOrg.id,
          status: "PENDING",
        },
      });

      await createOrganizationMembership(tx, {
        userId: createdUser.id,
        orgId: targetOrg.id,
        role: normalizedRole,
        isActive: true,
      });

      return createdUser;
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful! Waiting for admin approval.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  // SCENARIO 3: DIRECT REGISTRATION (Fallback or Superadmin)
  const {
    name,
    email,
    mobile,
    mobileCountryCode,
    countryCode,
    password,
    role,
    organization,
    organizationId,
  } = input;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email and password");
  }

  if (!validatePersonName(name)) {
    res.status(400);
    throw new Error("Full name can only include letters, spaces, dots, or hyphens");
  }

  const emailValidation = await validateEmail(email);
  if (!emailValidation.valid) {
    res.status(400);
    throw new Error(emailValidation.error);
  }

  if (!validatePasswordComplexity(password)) {
    res.status(400);
    throw new Error(
      "Password must be 8-64 characters and include uppercase, lowercase, number, and special character",
    );
  }

  const normalizedEmail = normalizeEmail(email);
  const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const normalizedRole = normalizeRole(role || "MEMBER");
  const resolvedOrganizationId = organizationId || organization || null;
  const isSuperAdminRegistration = normalizedRole === "SUPER_ADMIN";
  const requiresMemberDetails = normalizedRole === "MEMBER";

  if (!resolvedOrganizationId && !isSuperAdminRegistration) {
    res.status(400);
    throw new Error("organizationId is required for membership-based registration");
  }

  let normalizedPhone = null;

  normalizedPhone = normalizePhoneNumber({
    phone: mobile,
    countryCode: mobileCountryCode || countryCode,
    requireCountryCode: true,
  });
  const normalizedEmergencyContact = normalizeEmergencyContact({
    emergencyContact: input.emergencyContact,
    countryCode: mobileCountryCode || countryCode,
    required: requiresMemberDetails,
  });
  const normalizedCurrentAddress = normalizeAddressField({
    value: input.currentAddress,
    fieldName: "Current address",
    required: requiresMemberDetails,
  });
  const normalizedPermanentAddress = normalizeAddressField({
    value: input.permanentAddress,
    fieldName: "Permanent address",
    required: requiresMemberDetails,
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        mobile: normalizedPhone.e164,
        mobileCountryCode: normalizedPhone.countryCode,
        ...(normalizedEmergencyContact ? { emergencyContact: normalizedEmergencyContact } : {}),
        ...(normalizedCurrentAddress ? { currentAddress: normalizedCurrentAddress } : {}),
        ...(normalizedPermanentAddress ? { permanentAddress: normalizedPermanentAddress } : {}),
        password: hashedPassword,
        role: normalizedRole,
        orgId: resolvedOrganizationId ? Number(resolvedOrganizationId) : null,
        status: isSuperAdminRegistration ? "APPROVED" : "PENDING",
      },
    });

    if (resolvedOrganizationId) {
      await createOrganizationMembership(tx, {
        userId: createdUser.id,
        orgId: Number(resolvedOrganizationId),
        role: normalizedRole,
        isActive: true,
      });
    }

    return createdUser;
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, organizationCode, organizationId, organizationName, loginAs, rememberMe } =
    req.validatedBody || req.body || {};
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: authUserInclude,
  });

  if (!user) {
    const registrationRequestMessage = await findRegistrationRequestLoginBlockMessage({
      email: normalizedEmail,
      password,
    });

    if (registrationRequestMessage) {
      res.status(403);
      throw new Error(registrationRequestMessage);
    }

    res.status(401);
    throw new Error("Invalid credentials");
  }

  const inputPassword = String(password || "");
  const trimmedPassword = inputPassword.trim();
  const candidatePasswords = [inputPassword];
  if (trimmedPassword && trimmedPassword !== inputPassword) {
    candidatePasswords.push(trimmedPassword);
  }

  const passwordChecks = await Promise.all(
    candidatePasswords.map((candidate) => bcrypt.compare(candidate, user.password))
  );
  const isMatch = passwordChecks.some(Boolean);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (user.deletedAt) {
    res.status(403);
    throw new Error("Your account has been removed. Please contact your administrator.");
  }

  if (user.isActive === false) {
    res.status(403);
    throw new Error("Your account is inactive. Please contact your administrator.");
  }

  if (user.status === "PENDING") {
    res.status(403);
    throw new Error(PENDING_APPROVAL_LOGIN_MESSAGE);
  }

  if (user.status === "REJECTED") {
    res.status(403);
    throw new Error(REJECTED_APPROVAL_LOGIN_MESSAGE);
  }

  let authContext;
  try {
    authContext = resolveAuthMembership({
      user,
      loginAs,
      organizationId,
      organizationCode,
      organizationName,
    });
  } catch (error) {
    res.status(error.statusCode || 401);
    throw new Error(error.message || "Unable to resolve organization membership");
  }

  const currentRole = authContext.role;
  let org = authContext.organization || null;

  if (currentRole !== "SUPER_ADMIN") {
    if (!org) {
      res.status(404);
      throw new Error("Organization not found for this user");
    }

    if (org.isBlocked || org.isActive === false) {
      res.status(403);
      throw new Error("Your organization is blocked. Please contact support.");
    }

    if (org.deletedAt) {
      res.status(410);
      throw new Error("Your organization has been deactivated.");
    }

    const { organization: syncedOrganization, activeSubscription } =
      await syncOrganizationSubscriptionState({
        organizationId: org.id,
        organization: org,
        now: new Date(),
      });

    org = syncedOrganization || org;

    if (!activeSubscription) {
      if (currentRole !== "ORG_ADMIN") {
        res.status(402);
        throw new Error("Organization subscription expired. Please contact your admin to renew.");
      }
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      ...(currentRole !== "SUPER_ADMIN" && org?.id ? { orgId: org.id } : {}),
    },
    include: authUserWriteInclude,
  });

  const hydratedUser = mergeSessionUserState({
    previousUser: user,
    nextUser: updatedUser,
    organization: currentRole === "SUPER_ADMIN" ? null : org || updatedUser.organization || null,
  });

  const sessionUser =
    currentRole === "SUPER_ADMIN"
      ? {
          ...hydratedUser,
          orgId: null,
          organization: null,
        }
      : hydratedUser;

  const tokenTTL = rememberMe ? 30 * 24 * 60 * 60 : SESSION_TOKEN_TTL_SECONDS;
  const resolvedPermissions = resolveUserPermissions(sessionUser, org?.id);
  const token = jwt.sign(
    { 
      id: user.id,
      name: user.name,
      email: user.email,
      permissions: resolvedPermissions,
      role: currentRole,
      orgId: org?.id || null
    }, 
    process.env.JWT_KEY, 
    {
      expiresIn: tokenTTL,
    }
  );

  const redirectPath =
    currentRole === "ORG_ADMIN" && org?.subscriptionStatus === "EXPIRED"
      ? "/org/subscription"
      : getDashboardPathByRole(currentRole);

  res.cookie("token", token, getSessionCookieOptions(rememberMe));

  res.status(200).json({
    success: true,
    message: "Login successful",
    user: serializeSessionUser(sessionUser, org),
    token,
    redirectPath,
  });
});

exports.searchOrganizations = asyncHandler(async (req, res) => {
  const query = String(req.query.query || "").trim();
  const limit = parseSearchLimit(req.query.limit, 8, 12);
  const searchWhere = buildOrganizationSearchWhere({
    query,
    activeOnly: true,
  });

  if (!searchWhere) {
    return res.status(200).json({
      success: true,
      items: [],
      meta: {
        query,
        limit,
      },
    });
  }

  const items = await prisma.organization.findMany({
    where: searchWhere,
    select: organizationSearchSelect,
    orderBy: [{ name: "asc" }],
    take: limit,
  });

  res.status(200).json({
    success: true,
    items,
    meta: {
      query,
      limit,
      total: items.length,
    },
  });
});

exports.forgotPassword = asyncHandler(async (req, res) => {
  const requestBody = req.validatedBody || req.body || {};
  const user = await findPasswordResetUser(requestBody);

  if (user) {
    try {
      const token = createPasswordResetToken(user);
      await sendPasswordResetEmail({ user, token });
    } catch (error) {
      console.error("Failed to send password reset email:", error.message || error);
    }
  }

  res.status(200).json({
    success: true,
    message: GENERIC_PASSWORD_RESET_MESSAGE,
  });
});

exports.validateResetPasswordToken = asyncHandler(async (req, res) => {
  const { token } = req.validatedBody || req.body || {};
  const user = await validatePasswordResetToken(token);

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or expired.");
  }

  res.status(200).json({
    success: true,
    message: "Reset link verified.",
    emailHint: maskEmailAddress(user.email),
    role: resolveUserRole(user, resolveOrganizationId(user)) || "MEMBER",
    loginPath: getLoginPathByRole(resolveUserRole(user, resolveOrganizationId(user)) || "MEMBER"),
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.validatedBody || req.body || {};
  const user = await validatePasswordResetToken(token);

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or expired.");
  }

  if (!validatePasswordComplexity(password)) {
    res.status(400);
    throw new Error(
      "Password must be 8-64 characters and include uppercase, lowercase, number, and special character",
    );
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
    },
  });

  res.status(200).json({
    success: true,
    message: "Password reset successful. Please sign in with your new password.",
    loginPath: getLoginPathByRole(resolveUserRole(user, resolveOrganizationId(user)) || "MEMBER"),
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", getSessionCookieClearOptions());
  res.status(200).json({ message: "Logout successful" });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const userId = Number(req.user.id);

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: authUserInclude,
  });

  if (!existingUser) {
    res.status(404);
    throw new Error("User not found");
  }

  const payload = {};
  const requestBody = req.validatedBody || req.body || {};
  const hasName = Object.prototype.hasOwnProperty.call(requestBody, "name");
  const hasEmail = Object.prototype.hasOwnProperty.call(requestBody, "email");
  const hasMobile = Object.prototype.hasOwnProperty.call(requestBody, "mobile");
  const hasMobileCountryCode = Object.prototype.hasOwnProperty.call(requestBody, "mobileCountryCode");
  const hasProfileImageDataUrl = Object.prototype.hasOwnProperty.call(
    requestBody,
    "profileImageDataUrl"
  );
  const hasRemoveProfileImage = Object.prototype.hasOwnProperty.call(
    requestBody,
    "removeProfileImage"
  );
  const hasEmergencyContact = Object.prototype.hasOwnProperty.call(requestBody, "emergencyContact");
  const hasCurrentAddress = Object.prototype.hasOwnProperty.call(requestBody, "currentAddress");
  const hasPermanentAddress = Object.prototype.hasOwnProperty.call(requestBody, "permanentAddress");
  const hasBloodGroup = Object.prototype.hasOwnProperty.call(requestBody, "bloodGroup");

  if (hasEmergencyContact) {
    payload.emergencyContact = requestBody.emergencyContact;
  }
  if (hasCurrentAddress) {
    payload.currentAddress = requestBody.currentAddress;
  }
  if (hasPermanentAddress) {
    payload.permanentAddress = requestBody.permanentAddress;
  }
  if (hasBloodGroup) {
    payload.bloodGroup = requestBody.bloodGroup;
  }

  if (hasName) {
    const name = truncateText(requestBody.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("Name is required");
    }
    if (!validatePersonName(name)) {
      res.status(400);
      throw new Error("Full name can only include letters, spaces, dots, or hyphens");
    }
    payload.name = name;
  }

  if (hasEmail) {
    const email = normalizeEmail(requestBody.email);
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
    }

    const emailValidation = await validateEmail(email);
    if (!emailValidation.valid) {
      res.status(400);
      throw new Error(emailValidation.error);
    }

    if (email !== existingUser.email) {
      const duplicateUser = await prisma.user.findUnique({
        where: { email },
      });

      if (duplicateUser && Number(duplicateUser.id) !== userId) {
        res.status(409);
        throw new Error("User with this email already exists");
      }
    }

    payload.email = email;
  }

  if (hasMobile || hasMobileCountryCode) {
    const nextMobile = hasMobile ? requestBody.mobile : existingUser.mobile;
    const nextMobileCountryCode = hasMobileCountryCode
      ? requestBody.mobileCountryCode
      : existingUser.mobileCountryCode;
    const mobileValue = String(nextMobile || "").trim();

    if (!mobileValue) {
      res.status(400);
      throw new Error("Mobile number is required");
    }

    try {
      const currentRole = resolveUserRole(existingUser, resolveOrganizationId(existingUser));
      const normalizedPhone = normalizePhoneNumber({
        phone: mobileValue,
        countryCode: nextMobileCountryCode,
        requireCountryCode: currentRole !== "SUPER_ADMIN" && !mobileValue.startsWith("+"),
      });

      payload.mobile = normalizedPhone.e164;
      payload.mobileCountryCode = normalizedPhone.countryCode;
    } catch (error) {
      res.status(400);
      throw new Error(error.message || "Invalid mobile number");
    }
  }

  const shouldUploadProfileImage =
    hasProfileImageDataUrl && String(requestBody.profileImageDataUrl || "").trim().length > 0;
  const shouldRemoveProfileImage =
    hasRemoveProfileImage && requestBody.removeProfileImage === true;

  if (shouldUploadProfileImage && shouldRemoveProfileImage) {
    res.status(400);
    throw new Error("Choose either a new profile image or remove the current one.");
  }

  let uploadedProfileImage = null;
  let didPersistUploadedProfileImage = false;

  if (shouldUploadProfileImage) {
    try {
      uploadedProfileImage = await uploadProfileImage({
        userId,
        dataUrl: requestBody.profileImageDataUrl,
      });
      payload.profileImageUrl = uploadedProfileImage.url;
      payload.profileImagePublicId = uploadedProfileImage.publicId;
    } catch (error) {
      res.status(error.statusCode || 500);
      throw new Error(error.message || "Failed to upload profile image.");
    }
  } else if (shouldRemoveProfileImage) {
    payload.profileImageUrl = null;
    payload.profileImagePublicId = null;
  }

  if (Object.keys(payload).length === 0) {
    res.status(400);
    throw new Error("No profile changes were provided");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: payload,
      include: authUserWriteInclude,
    });
    didPersistUploadedProfileImage = Boolean(uploadedProfileImage?.publicId);

    if (
      shouldUploadProfileImage &&
      existingUser.profileImagePublicId &&
      existingUser.profileImagePublicId !== uploadedProfileImage?.publicId
    ) {
      await deleteProfileImage(existingUser.profileImagePublicId);
    }

    if (shouldRemoveProfileImage && existingUser.profileImagePublicId) {
      await deleteProfileImage(existingUser.profileImagePublicId);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: serializeSessionUser(
        mergeSessionUserState({
          previousUser: existingUser,
          nextUser: updatedUser,
          organization: updatedUser.organization || existingUser.organization || null,
        }),
        updatedUser.organization || existingUser.organization || null
      ),
    });
  } catch (error) {
    if (uploadedProfileImage?.publicId && !didPersistUploadedProfileImage) {
      await deleteProfileImage(uploadedProfileImage.publicId);
    }

    throw error;
  }
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user.id) },
    include: authUserInclude,
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    user: serializeSessionUser(user, user.organization || null),
  });
});

exports.saveLead = asyncHandler(async (req, res) => {
  const { org, admin } = req.body || {};

  if (!org?.email) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  // Upsert the lead based on organization email
  const lead = await prisma.registrationLead.upsert({
    where: { organizationEmail: org.email },
    update: {
      organizationName: org.name || "Unknown",
      organizationPhone: org.mobile || org.phone || "",
      organizationCity: org.city || null,
      organizationState: org.state || null,
      organizationCountry: org.country || null,
      organizationAddress: org.address || null,
      ...(admin?.email ? { adminEmail: admin.email } : {}),
      ...(admin?.name ? { adminName: admin.name } : {}),
      ...(admin?.mobile ? { adminPhone: admin.mobile } : {}),
    },
    create: {
      organizationName: org.name || "Unknown",
      organizationEmail: org.email,
      organizationPhone: org.mobile || org.phone || "",
      organizationCity: org.city || null,
      organizationState: org.state || null,
      organizationCountry: org.country || null,
      organizationAddress: org.address || null,
      adminName: admin?.name || null,
      adminEmail: admin?.email || null,
      adminPhone: admin?.mobile || null,
    },
  });

  res.status(200).json({ success: true, data: lead });
});

exports.checkEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return res.status(400).json({ success: false, message: "Invalid email" });
  }

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true }
  });

  res.status(200).json({ success: true, exists: !!user });
});

exports.updatePushToken = asyncHandler(async (req, res) => {
  const { pushToken } = req.body;
  
  if (!pushToken) {
    return res.status(400).json({ success: false, message: "Push token is required" });
  }

  await prisma.user.update({
    where: { id: req.user.id },
    data: { expoPushToken: pushToken }
  });

  res.status(200).json({ success: true, message: "Push token updated successfully" });
});
