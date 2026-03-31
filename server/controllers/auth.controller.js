const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { normalizeRole, getDashboardPathByRole } = require("../constants/rbac");
const { resolveUserPermissions } = require("../constants/permissions");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { normalizeUser } = require("../utils/identity");
const { truncateText } = require("../services/common.service");
const { syncOrganizationSubscriptionState } = require("../services/subscription.service");
const sendEmail = require("../utils/email");

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 15;
const PASSWORD_RESET_TOKEN_TTL_SECONDS = PASSWORD_RESET_TOKEN_TTL_MINUTES * 60;
const GENERIC_PASSWORD_RESET_MESSAGE =
  "If this account exists, we have sent a reset link to the registered email address.";

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

  return "http://localhost:3000";
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

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
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
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
  const requestedRole = normalizeRole(loginAs);
  const requestedOrganizationId = parseOrganizationId(organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();

  if (!normalizedEmail) return null;

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!user) return null;

  const normalizedUserRole = normalizeRole(user.role);
  if (normalizedUserRole !== requestedRole) {
    return null;
  }

  if (user.deletedAt || user.isActive === false) {
    return null;
  }

  if (normalizedUserRole !== "SUPER_ADMIN") {
    const org = user.organization;
    if (!org || org.deletedAt) {
      return null;
    }

    if (!requestedOrganizationId && !normalizedOrganizationCode) {
      return null;
    }

    if (requestedOrganizationId && Number(org.id) !== requestedOrganizationId) {
      return null;
    }

    if (
      normalizedOrganizationCode &&
      String(org.organizationCode || "").trim().toUpperCase() !== normalizedOrganizationCode
    ) {
      return null;
    }
  }

  return user;
};

const sendPasswordResetEmail = async ({ user, token }) => {
  const resetUrl = `${getClientBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const roleLabel = formatRoleLabel(user.role);
  const loginPath = getLoginPathByRole(user.role);
  const loginUrl = `${getClientBaseUrl()}${loginPath}`;
  const organizationSummary =
    user.organization && !user.organization.deletedAt
      ? [user.organization.name, user.organization.organizationCode]
          .filter(Boolean)
          .join(" - ")
      : "Platform account";
  const safeName = escapeHtml(user.name || "there");
  const safeRoleLabel = escapeHtml(roleLabel);
  const safeEmail = escapeHtml(user.email || "");
  const safeOrganizationSummary = escapeHtml(organizationSummary);
  const safeResetUrl = escapeHtml(resetUrl);
  const safeLoginUrl = escapeHtml(loginUrl);
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
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px 16px;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08)">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0c447c,#1e70d1,#5cd1e5);color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;opacity:0.85">Password Reset</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800">Reset your Veagle Attendee password</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7">Hello <strong>${safeName}</strong>,</p>
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7">
            We received a request to reset the password for your <strong>${safeRoleLabel}</strong> account.
          </p>
          <div style="margin:0 0 24px;border:1px solid #dbeafe;border-radius:18px;background:#eff6ff;padding:18px 20px">
            <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:#1d4ed8">Account Details</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Email:</strong> ${safeEmail}</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Role:</strong> ${safeRoleLabel}</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#0f172a"><strong>Workspace:</strong> ${safeOrganizationSummary}</p>
          </div>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7">
            Click the button below to set a new password. This link will expire in
            <strong> ${PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes</strong>.
          </p>
          <a href="${safeResetUrl}" style="display:inline-block;padding:14px 22px;border-radius:16px;background:#1e70d1;color:#ffffff;text-decoration:none;font-weight:700">
            Reset Password
          </a>
          <p style="margin:18px 0 0;font-size:13px;line-height:1.7;color:#475569">
            After you save a new password, your previous password will stop working immediately.
          </p>
          <p style="margin:24px 0 10px;font-size:13px;line-height:1.7;color:#475569">
            If the button does not open, copy and paste this link into your browser:
          </p>
          <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.7;color:#1d4ed8">
            ${safeResetUrl}
          </p>
          <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#475569">
            Sign-in page:
          </p>
          <p style="margin:0;word-break:break-all;font-size:13px;line-height:1.7;color:#1d4ed8">
            ${safeLoginUrl}
          </p>
          <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#64748b">
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

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
}) => {
  const requestedOrganizationId = parseOrganizationId(organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();

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
    role: normalized.role,
    permissions: normalized.permissions,
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
          city: org.city || null,
          state: org.state || null,
          country: org.country || null,
          subscriptionStatus: org.subscriptionStatus || null,
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
    dashboardPath: getDashboardPathByRole(normalized.role),
  };
};

exports.register = asyncHandler(async (req, res) => {
  const input = req.validatedBody || req.body || {};
  const { org, admin, plan, organizationCode, ...userData } = input;
  const requestedOrganizationId = parseOrganizationId(input?.organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();

  // SCENARIO 1: ORGANISATION ONBOARDING
  // DISABLED: Organisations must now register via the Payment flow (/api/payment/verify-and-register)
  if (org && admin && plan) {
    res.status(400);
    throw new Error("Use /api/payment/verify-and-register for organization onboarding");
  }

  // SCENARIO 2: MEMBER JOINING (organizationCode present)
  if (requestedOrganizationId || normalizedOrganizationCode) {
    if (!userData.name || !userData.email || !userData.mobile || !userData.password) {
      res.status(400);
      throw new Error("Please provide name, email, mobile and password");
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
    });

    if (!targetOrg) {
      res.status(404);
      throw new Error("Selected organization was not found");
    }

    if (targetOrg.isBlocked || targetOrg.isActive === false || targetOrg.deletedAt) {
      res.status(403);
      throw new Error("This organization is not available for new registrations");
    }

    const maxUsers = Number(targetOrg.plan?.memberLimit || targetOrg.plan?.maxUsers || 0);
    if (maxUsers > 0) {
      const userCount = await prisma.user.count({
        where: {
          orgId: targetOrg.id,
          deletedAt: null,
        },
      });

      if (userCount >= maxUsers) {
        res.status(403);
        throw new Error(`User limit reached for this organization's plan (${maxUsers} users). Please contact your administrator.`);
      }
    }

    const userExists = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    if (userExists) {
      res.status(400);
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const normalizedRole = normalizeRole(userData.role || "MEMBER");

    const user = await prisma.user.create({
      data: {
        name: String(userData.name).trim(),
        email: normalizedEmail,
        mobile: normalizedPhone.e164,
        mobileCountryCode: normalizedPhone.countryCode,
        password: hashedPassword,
        role: normalizedRole,
        permissions: resolveUserPermissions(normalizedRole),
        orgId: targetOrg.id,
        status: "PENDING",
      },
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

  const normalizedEmail = normalizeEmail(email);
  const userExists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (userExists) {
    res.status(400);
    throw new Error("User already exists");
  }

  const normalizedRole = normalizeRole(role || "MEMBER");
  const resolvedOrganizationId = organizationId || organization || null;
  if (normalizedRole !== "SUPER_ADMIN" && !resolvedOrganizationId) {
    res.status(400);
    throw new Error("organizationId is required for non-super-admin users");
  }

  let normalizedPhone = null;

  if (normalizedRole !== "SUPER_ADMIN") {
    normalizedPhone = normalizePhoneNumber({
      phone: mobile,
      countryCode: mobileCountryCode || countryCode,
      requireCountryCode: true,
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: String(name).trim(),
      email: normalizedEmail,
      mobile: normalizedPhone?.e164 || String(mobile || "").trim(),
      mobileCountryCode: normalizedPhone?.countryCode || null,
      password: hashedPassword,
      role: normalizedRole,
      permissions: resolveUserPermissions(normalizedRole),
      orgId: normalizedRole === "SUPER_ADMIN" ? null : Number(resolvedOrganizationId),
      status: normalizedRole === "SUPER_ADMIN" ? "APPROVED" : "PENDING",
    },
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password, organizationCode, organizationId, loginAs } =
    req.validatedBody || req.body || {};
  const normalizedEmail = normalizeEmail(email);

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!user) {
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

  const normalizedRole = normalizeRole(user.role);
  const resolvedPermissions = resolveUserPermissions(user);
  let org = user.organization || null;
  const requestedRole = loginAs ? normalizeRole(loginAs) : null;
  const effectiveRole = requestedRole || normalizedRole;
  const requestedOrganizationId = parseOrganizationId(organizationId);
  const normalizedOrganizationCode = String(organizationCode || "").trim().toUpperCase();

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
    throw new Error("Your registration is pending admin approval.");
  }

  if (user.status === "REJECTED") {
    res.status(403);
    throw new Error("Your registration request was rejected. Contact your administrator.");
  }

  if (requestedRole && requestedRole !== normalizedRole) {
    res.status(401);
    throw new Error(`Selected role (${requestedRole}) does not match this account`);
  }

  if (effectiveRole !== "SUPER_ADMIN" && !requestedOrganizationId && !normalizedOrganizationCode) {
    res.status(400);
    throw new Error("Organization selection is required for this role");
  }

  if (effectiveRole !== "SUPER_ADMIN") {
    const organizationMismatch =
      !org ||
      (requestedOrganizationId && Number(org.id) !== requestedOrganizationId) ||
      (normalizedOrganizationCode && org.organizationCode !== normalizedOrganizationCode);

    if (organizationMismatch) {
      res.status(401);
      throw new Error("Selected organization does not match this user");
    }
  }

  if (normalizedRole !== "SUPER_ADMIN") {
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
      if (normalizedRole !== "ORG_ADMIN") {
        res.status(402);
        throw new Error("Organization subscription expired. Please contact your admin to renew.");
      }
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = jwt.sign({ id: user.id, role: normalizedRole }, process.env.JWT_KEY, {
    expiresIn: "7d",
  });

  const redirectPath =
    normalizedRole === "ORG_ADMIN" && org?.subscriptionStatus === "EXPIRED"
      ? "/org/subscription"
      : getDashboardPathByRole(normalizedRole);

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: serializeSessionUser(
      {
        ...user,
        role: normalizedRole,
        permissions: resolvedPermissions,
      },
      org
    ),
    redirectPath,
  });
});

exports.searchOrganizations = asyncHandler(async (req, res) => {
  const query = String(req.query.query || "").trim();
  const limit = parseSearchLimit(req.query.limit, 8, 12);
  const normalizedQuery = query;

  if (normalizedQuery.length < 2) {
    return res.status(200).json({
      success: true,
      items: [],
      meta: {
        query: normalizedQuery,
        limit,
      },
    });
  }

  const items = await prisma.organization.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      isBlocked: false,
      OR: [
        { name: { contains: normalizedQuery } },
        { organizationCode: { contains: normalizedQuery } },
        { city: { contains: normalizedQuery } },
        { state: { contains: normalizedQuery } },
      ],
    },
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
    role: normalizeRole(user.role),
    loginPath: getLoginPathByRole(user.role),
  });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.validatedBody || req.body || {};
  const user = await validatePasswordResetToken(token);

  if (!user) {
    res.status(400);
    throw new Error("Reset link is invalid or expired.");
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
    loginPath: getLoginPathByRole(user.role),
  });
});

exports.logout = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.status(200).json({ message: "Logout successful" });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const userId = Number(req.user.id);

  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
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

  if (hasName) {
    const name = truncateText(requestBody.name, 120);
    if (!name) {
      res.status(400);
      throw new Error("Name is required");
    }
    payload.name = name;
  }

  if (hasEmail) {
    const email = normalizeEmail(requestBody.email);
    if (!email) {
      res.status(400);
      throw new Error("Email is required");
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
      const normalizedPhone = normalizePhoneNumber({
        phone: mobileValue,
        countryCode: nextMobileCountryCode,
        requireCountryCode:
          normalizeRole(existingUser.role) !== "SUPER_ADMIN" && !mobileValue.startsWith("+"),
      });

      payload.mobile = normalizedPhone.e164;
      payload.mobileCountryCode = normalizedPhone.countryCode;
    } catch (error) {
      res.status(400);
      throw new Error(error.message || "Invalid mobile number");
    }
  }

  if (Object.keys(payload).length === 0) {
    res.status(400);
    throw new Error("No profile changes were provided");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: payload,
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user: serializeSessionUser(updatedUser, updatedUser.organization || null),
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.user.id) },
    include: {
      organization: {
        include: {
          plan: true,
        },
      },
    },
  });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.status(200).json({
    user: serializeSessionUser(user, user.organization || null),
  });
});
