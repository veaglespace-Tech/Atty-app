const Razorpay = require("razorpay");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { getDefaultPermissionsForRole } = require("../constants/permissions");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { generateUniqueOrgCode } = require("../utils/org-code");
const { isLegacyPaidMonthlyPlan } = require("../services/plan.service");
const sendEmail = require("../utils/email");
const { truncateText, formatDate } = require("../services/common.service");

const FALLBACK_PLANS = {
  BASIC: {
    code: "BASIC",
    name: "Basic",
    price: 999,
    currency: "INR",
    durationInDays: 30,
  },
  PRO: {
    code: "PRO",
    name: "Pro",
    price: 1999,
    currency: "INR",
    durationInDays: 30,
  },
  ADVANCED: {
    code: "ADVANCED",
    name: "Advanced",
    price: 2999,
    currency: "INR",
    durationInDays: 30,
  },
};
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const getRazorpayCredentials = () => ({
  keyId:
    process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_API_KEY ||
    process.env.RAZORPAY_KEY ||
    process.env.KEY_ID ||
    process.env.RP_KEY_ID ||
    "",
  keySecret:
    process.env.RAZORPAY_KEY_SECRET ||
    process.env.RAZORPAY_API_SECRET ||
    process.env.RAZORPAY_SECRET ||
    process.env.KEY_SECRET ||
    process.env.RP_KEY_SECRET ||
    "",
});

const getRazorpayClient = () => {
  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const parseCoordinates = (organization = {}) => {
  const candidate = organization.location;

  if (
    candidate &&
    typeof candidate === "object" &&
    Array.isArray(candidate.coordinates) &&
    candidate.coordinates.length === 2
  ) {
    const longitude = Number(candidate.coordinates[0]);
    const latitude = Number(candidate.coordinates[1]);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return { longitude, latitude };
    }
  }

  if (Array.isArray(organization.orgLocation) && organization.orgLocation.length === 2) {
    const longitude = Number(organization.orgLocation[0]);
    const latitude = Number(organization.orgLocation[1]);
    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return { longitude, latitude };
    }
  }

  return { longitude: 0, latitude: 0 };
};

const isFreeTrialPlan = (plan = {}) => {
  const code = String(plan.code || "").toUpperCase();
  const price = Number(plan.price || 0);
  return code.includes("FREE") || price <= 0;
};

const ensureFreeTrialAvailable = async ({ orgEmail, adminEmail, adminPhone }) => {
  const where = {
    OR: [
      { orgEmail },
      { adminEmail },
      ...(adminPhone ? [{ adminPhone }] : []),
    ],
  };

  const existing = await prisma.freeTrialClaim.findFirst({ where });
  if (existing) {
    const error = new Error("Free trial already used for this organization/admin.");
    error.statusCode = 409;
    throw error;
  }
};

const classifyDbError = (dbError) => {
  if (!dbError || typeof dbError !== "object") return null;

  if (dbError.code === "P2002") {
    const target = Array.isArray(dbError?.meta?.target)
      ? dbError.meta.target.join(",")
      : String(dbError?.meta?.target || "");

    if (target.includes("orgEmail") || target.includes("adminEmail") || target.includes("adminPhone")) {
      return { status: 409, message: "Free trial already used for this organization/admin." };
    }
    if (target.toLowerCase().includes("email")) {
      return { status: 409, message: "Email already exists. Please use a different email." };
    }
    return { status: 409, message: "Duplicate data found. Please check entered details." };
  }

  if (dbError.code === "P2003") {
    return { status: 400, message: "Invalid reference data. Please reselect plan and retry." };
  }

  if (dbError.code === "P2000") {
    return { status: 400, message: "Some field values are too long. Please shorten names/address and try again." };
  }

  return null;
};

const resolvePlanForCheckout = async (planCode) => {
  const normalizedPlanCode = String(planCode || "").toUpperCase().trim();
  if (!normalizedPlanCode) {
    const error = new Error("Plan code is required");
    error.statusCode = 400;
    throw error;
  }

  const dbPlan = await prisma.plan.findFirst({
    where: {
      code: normalizedPlanCode,
      isActive: true,
    },
  });

  const fallbackPlan = FALLBACK_PLANS[normalizedPlanCode] || null;
  const plan = dbPlan
    ? {
        code: dbPlan.code,
        id: dbPlan.id,
        name: dbPlan.name,
        price: dbPlan.price,
        durationInDays: dbPlan.durationInDays,
        currency: dbPlan.currency || "INR",
      }
    : fallbackPlan;

  if (!plan) {
    const error = new Error("Invalid or inactive plan");
    error.statusCode = 404;
    throw error;
  }

  if (isLegacyPaidMonthlyPlan(plan)) {
    const error = new Error("This plan is no longer available. Please choose a 3, 6, or 12 month plan.");
    error.statusCode = 404;
    throw error;
  }

  return {
    normalizedPlanCode,
    dbPlan,
    plan,
    freeTrialPlan: isFreeTrialPlan(plan),
  };
};

const roundMoney = (value) => Math.max(0, Number(Number(value || 0).toFixed(2)));

const getRemainingMs = (endDate, now = new Date()) => {
  const end = new Date(endDate || 0);
  if (Number.isNaN(end.getTime()) || end <= now) return 0;
  return end.getTime() - now.getTime();
};

const calculateProratedCredit = (subscription, now = new Date()) => {
  if (!subscription?.startDate || !subscription?.endDate) return 0;

  const start = new Date(subscription.startDate);
  const end = new Date(subscription.endDate);
  const amount = Number(subscription.amount || 0);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= now ||
    amount <= 0
  ) {
    return 0;
  }

  const totalMs = Math.max(end.getTime() - start.getTime(), DAY_IN_MS);
  const remainingMs = getRemainingMs(end, now);
  return roundMoney(amount * (remainingMs / totalMs));
};

const createGatewayOrderForPlan = async (plan, amountOverride = null) => {
  const resolvedAmount = roundMoney(amountOverride === null ? plan.price : amountOverride);
  const options = {
    amount: Math.round(resolvedAmount * 100),
    currency: plan.currency || "INR",
    receipt: `receipt_${Date.now()}`,
    notes: {
      planCode: plan.code,
      payableAmount: String(resolvedAmount),
    },
  };

  const razorpay = getRazorpayClient();
  if (!razorpay) {
    const error = new Error("Razorpay key configuration is missing on server");
    error.statusCode = 500;
    throw error;
  }

  return razorpay.orders.create(options);
};

const resolveRenewalContext = async ({ organizationId, planCode }) => {
  const organization = await prisma.organization.findUnique({
    where: { id: Number(organizationId) },
    include: {
      plan: {
        select: {
          id: true,
          name: true,
          code: true,
          price: true,
          durationInDays: true,
          currency: true,
        },
      },
    },
  });

  if (!organization) {
    const error = new Error("Organization not found");
    error.statusCode = 404;
    throw error;
  }

  const { normalizedPlanCode, dbPlan, plan, freeTrialPlan } = await resolvePlanForCheckout(planCode);
  const now = new Date();
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      orgId: Number(organizationId),
      status: "ACTIVE",
      endDate: {
        gte: now,
      },
    },
    orderBy: [{ endDate: "desc" }, { createdAt: "desc" }],
  });

  const remainingMs = getRemainingMs(activeSubscription?.endDate, now);
  const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / DAY_IN_MS) : 0;
  const currentPlanCode = String(activeSubscription?.planCode || organization.plan?.code || "")
    .trim()
    .toUpperCase();
  const hasActiveSubscription = Boolean(activeSubscription && remainingMs > 0);
  const samePlan = hasActiveSubscription && currentPlanCode === normalizedPlanCode;
  const mode = hasActiveSubscription ? (samePlan ? "EXTEND" : "UPGRADE") : "RENEW";
  const upgradeCredit = mode === "UPGRADE" ? calculateProratedCredit(activeSubscription, now) : 0;
  const payableAmount =
    mode === "EXTEND"
      ? roundMoney(plan.price)
      : roundMoney(Math.max(Number(plan.price || 0) - upgradeCredit, 0));
  const durationInDays = Number(plan.durationInDays || 0) || 30;
  const effectiveStartDate =
    mode === "EXTEND" && activeSubscription?.endDate ? new Date(activeSubscription.endDate) : now;
  const expiryDate = new Date(effectiveStartDate.getTime() + durationInDays * DAY_IN_MS);

  return {
    organization,
    activeSubscription,
    normalizedPlanCode,
    dbPlan,
    plan,
    freeTrialPlan,
    mode,
    upgradeCredit,
    payableAmount,
    remainingDays,
    currentPlanCode,
    currentExpiry: activeSubscription?.endDate || organization.subscriptionExpiry || null,
    durationInDays,
    now,
    expiryDate,
  };
};

const sendRenewalConfirmationEmail = async ({
  organization,
  user,
  plan,
  expiryDate,
  chargedAmount,
  creditAmount = 0,
  mode = "RENEW",
}) => {
  const actionLabel =
    mode === "UPGRADE" ? "upgraded" : mode === "EXTEND" ? "extended" : "renewed";
  const emailMessage = `Hello ${user.name},

Your Veagle Attendee subscription has been ${actionLabel} successfully.

Organization:
- Name: ${organization.name}
- Code: ${organization.organizationCode}

Plan Details:
- Plan: ${plan.name}
- Charged Amount: Rs. ${Number(chargedAmount || 0).toLocaleString("en-IN")}
- Credit Applied: Rs. ${Number(creditAmount || 0).toLocaleString("en-IN")}
- Expiry Date: ${formatDate(expiryDate)}

You can now continue using your workspace with full access.

Best Regards,
Veagle Attendee Team`;

  const emailHtml = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:32px 16px;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:24px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08)">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#0c447c,#1e70d1,#5cd1e5);color:#ffffff">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;opacity:0.85">Subscription Renewed</p>
          <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:800">Your workspace is active again</h1>
        </div>
        <div style="padding:32px">
          <p style="margin:0 0 12px;font-size:15px;line-height:1.7">Hello <strong>${user.name}</strong>,</p>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.7">
            Your Veagle Attendee subscription has been renewed successfully for
            <strong> ${organization.name}</strong>.
          </p>
          <div style="margin:0 0 20px;border:1px solid #dbeafe;border-radius:18px;background:#eff6ff;padding:18px 20px">
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Organization Code:</strong> ${organization.organizationCode}</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Plan:</strong> ${plan.name}</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Charged Amount:</strong> Rs. ${Number(chargedAmount || 0).toLocaleString("en-IN")}</p>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.7;color:#0f172a"><strong>Credit Applied:</strong> Rs. ${Number(creditAmount || 0).toLocaleString("en-IN")}</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#0f172a"><strong>Expiry Date:</strong> ${formatDate(expiryDate)}</p>
          </div>
          <p style="margin:0;font-size:14px;line-height:1.7;color:#475569">
            Your admin dashboard and related workspace access are now active again.
          </p>
        </div>
      </div>
    </div>
  `;

  return sendEmail({
    email: user.email,
    subject: `Subscription renewed - ${organization.organizationCode}`,
    message: emailMessage,
    html: emailHtml,
  });
};

// @desc    Get Razorpay Public Key
// @route   GET /api/payment/get-key
// @access  Public
exports.getPublicKey = asyncHandler(async (req, res) => {
  const { keyId } = getRazorpayCredentials();
  if (!keyId) {
    res.status(500);
    throw new Error("Razorpay public key is missing in server environment");
  }

  res.status(200).json({
    success: true,
    key: keyId,
  });
});

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Public (for onboarding)
exports.createOrder = asyncHandler(async (req, res) => {
  const { planCode, organization, admin } = req.body || {};

  const { dbPlan, plan, freeTrialPlan } = await resolvePlanForCheckout(planCode);
  if (freeTrialPlan) {
    const orgEmail = normalizeEmail(organization?.email);
    const adminEmail = normalizeEmail(admin?.email);

    if (!orgEmail || !adminEmail) {
      res.status(400);
      throw new Error("Organization and admin details are required for free trial.");
    }

    let adminPhone = null;
    try {
      const normalizedPhone = normalizePhoneNumber({
        phone: admin?.mobile,
        countryCode: admin?.mobileCountryCode || admin?.countryCode,
        requireCountryCode: true,
      });
      adminPhone = normalizedPhone.e164;
    } catch {
      // Phone validation will happen in verify-and-register as well.
    }

    try {
      await ensureFreeTrialAvailable({ orgEmail, adminEmail, adminPhone });
    } catch (error) {
      res.status(error.statusCode || 500);
      throw new Error(error.message || "Unable to validate free trial eligibility.");
    }

    return res.status(200).json({
      success: true,
      freeTrial: true,
      order: null,
      plan: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        durationInDays: plan.durationInDays || 7,
      },
      source: dbPlan ? "DB" : "FALLBACK",
    });
  }

  try {
    const order = await createGatewayOrderForPlan(plan);
    res.status(200).json({
      success: true,
      freeTrial: false,
      order,
      plan: {
        code: plan.code,
        name: plan.name,
        price: plan.price,
        durationInDays: plan.durationInDays || null,
      },
      source: dbPlan ? "DB" : "FALLBACK",
    });
  } catch (error) {
    console.error("Razorpay Order Error:", error);
    res.status(error?.statusCode || (res.statusCode === 200 ? 500 : res.statusCode));
    const message =
      error?.message === "Razorpay key configuration is missing on server"
        ? error.message
        : "Failed to create Razorpay order";
    throw new Error(message);
  }
});

// @desc    Create Razorpay Order for existing org renewal
// @route   POST /api/payment/create-renewal-order
// @access  Private/Org Admin
exports.createRenewalOrder = asyncHandler(async (req, res) => {
  const { planCode } = req.body || {};
  const organizationId = Number(req.user?.organizationId || req.user?.organization);

  if (!organizationId) {
    res.status(403);
    throw new Error("Organization context missing");
  }

  const renewalContext = await resolveRenewalContext({
    organizationId,
    planCode,
  });

  if (
    renewalContext.organization.isBlocked ||
    renewalContext.organization.isActive === false ||
    renewalContext.organization.deletedAt
  ) {
    res.status(403);
    throw new Error("Organization access is blocked");
  }

  if (renewalContext.freeTrialPlan) {
    res.status(400);
    throw new Error("Existing organizations cannot renew with a free trial plan.");
  }

  try {
    const order =
      renewalContext.payableAmount > 0
        ? await createGatewayOrderForPlan(renewalContext.plan, renewalContext.payableAmount)
        : null;

    res.status(200).json({
      success: true,
      freeRenewal: renewalContext.payableAmount <= 0,
      order,
      plan: {
        code: renewalContext.plan.code,
        name: renewalContext.plan.name,
        price: renewalContext.plan.price,
        payableAmount: renewalContext.payableAmount,
        upgradeCredit: renewalContext.upgradeCredit,
        durationInDays: renewalContext.durationInDays,
        currency: renewalContext.plan.currency || "INR",
      },
      renewal: {
        mode: renewalContext.mode,
        remainingDays: renewalContext.remainingDays,
        currentExpiry: renewalContext.currentExpiry,
        nextExpiry: renewalContext.expiryDate,
      },
      currentSubscription: renewalContext.activeSubscription
        ? {
            id: renewalContext.activeSubscription.id,
            planName: renewalContext.activeSubscription.planName,
            planCode: renewalContext.activeSubscription.planCode,
            amount: renewalContext.activeSubscription.amount,
            startDate: renewalContext.activeSubscription.startDate,
            endDate: renewalContext.activeSubscription.endDate,
          }
        : null,
      organization: {
        id: renewalContext.organization.id,
        name: renewalContext.organization.name,
        organizationCode: renewalContext.organization.organizationCode,
      },
    });
  } catch (error) {
    console.error("Renewal Razorpay Order Error:", error);
    res.status(error?.statusCode || (res.statusCode === 200 ? 500 : res.statusCode));
    throw new Error(error?.message || "Failed to create renewal order");
  }
});

// @desc    Verify Payment and renew existing organization subscription
// @route   POST /api/payment/verify-renewal
// @access  Private/Org Admin
exports.verifyRenewal = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planCode,
  } = req.body || {};

  const organizationId = Number(req.user?.organizationId || req.user?.organization);
  const userId = Number(req.user?.id);

  if (!organizationId || !userId) {
    res.status(403);
    throw new Error("Organization context missing");
  }

  const [renewalContext, user] = await Promise.all([
    resolveRenewalContext({
      organizationId,
      planCode,
    }),
    prisma.user.findUnique({
      where: { id: userId },
    }),
  ]);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (
    renewalContext.organization.isBlocked ||
    renewalContext.organization.isActive === false ||
    renewalContext.organization.deletedAt
  ) {
    res.status(403);
    throw new Error("Organization access is blocked");
  }

  if (renewalContext.freeTrialPlan) {
    res.status(400);
    throw new Error("Existing organizations cannot renew with a free trial plan.");
  }

  if (renewalContext.payableAmount > 0) {
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error("Payment details are required");
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      res.status(500);
      throw new Error("Razorpay secret key is missing on server");
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400);
      throw new Error("Invalid payment signature. Verification failed.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let subscription = null;

    if (renewalContext.mode === "EXTEND" && renewalContext.activeSubscription) {
      subscription = await tx.subscription.update({
        where: { id: renewalContext.activeSubscription.id },
        data: {
          endDate: renewalContext.expiryDate,
          notes: `Extended by ${user.email}`,
          razorpayOrderId: razorpay_order_id || renewalContext.activeSubscription.razorpayOrderId,
          razorpayPaymentId:
            razorpay_payment_id || renewalContext.activeSubscription.razorpayPaymentId,
          razorpaySignature:
            razorpay_signature || renewalContext.activeSubscription.razorpaySignature,
        },
      });
    } else {
      await tx.subscription.updateMany({
        where: {
          orgId: organizationId,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
          activeKey: null,
        },
      });

      subscription = await tx.subscription.create({
        data: {
          orgId: organizationId,
          planId:
            renewalContext.dbPlan
              ? renewalContext.dbPlan.id
              : renewalContext.organization.planId || null,
          planName: renewalContext.plan.name,
          planCode: renewalContext.normalizedPlanCode,
          amount: Number(renewalContext.plan.price || 0),
          currency: renewalContext.plan.currency || "INR",
          status: "ACTIVE",
          startDate: renewalContext.now,
          endDate: renewalContext.expiryDate,
          razorpayOrderId: razorpay_order_id || null,
          razorpayPaymentId: razorpay_payment_id || null,
          razorpaySignature: razorpay_signature || null,
          createdById: userId,
          notes:
            renewalContext.mode === "UPGRADE"
              ? `Upgraded by ${user.email}. Credit applied: Rs. ${renewalContext.upgradeCredit}`
              : `Renewed by ${user.email}`,
          activeKey: `ORG_${organizationId}`,
        },
      });
    }

    await tx.payment.create({
      data: {
        orgId: organizationId,
        userId,
        subscriptionId: subscription.id,
        planName: renewalContext.plan.name,
        planCode: renewalContext.normalizedPlanCode,
        amount: Number(renewalContext.payableAmount || 0),
        currency: renewalContext.plan.currency || "INR",
        gateway: renewalContext.payableAmount > 0 ? "RAZORPAY" : "PLAN_CREDIT",
        razorpayOrderId: razorpay_order_id || null,
        razorpayPaymentId: razorpay_payment_id || null,
        razorpaySignature: razorpay_signature || null,
        status: "SUCCESS",
      },
    });

    const updatedOrganization = await tx.organization.update({
      where: {
        id: organizationId,
      },
      data: {
        planId:
          renewalContext.dbPlan
            ? renewalContext.dbPlan.id
            : renewalContext.organization.planId || null,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiry: renewalContext.expiryDate,
        subscriptionId: subscription.id,
      },
    });

    return {
      subscription,
      updatedOrganization,
    };
  });

  let emailSent = false;
  try {
    await sendRenewalConfirmationEmail({
      organization: {
        ...renewalContext.organization,
        ...result.updatedOrganization,
      },
      user,
      plan: renewalContext.plan,
      expiryDate: renewalContext.expiryDate,
      chargedAmount: renewalContext.payableAmount,
      creditAmount: renewalContext.upgradeCredit,
      mode: renewalContext.mode,
    });
    emailSent = true;
  } catch (emailError) {
    console.error("Failed to send renewal email:", emailError.message || emailError);
  }

  res.status(200).json({
    success: true,
    message:
      renewalContext.mode === "UPGRADE"
        ? "Subscription upgraded successfully."
        : renewalContext.mode === "EXTEND"
          ? "Subscription extended successfully."
          : "Subscription renewed successfully.",
    emailSent,
    redirectPath: "/org/dashboard",
    subscription: {
      id: result.subscription.id,
      planName: result.subscription.planName,
      planCode: result.subscription.planCode,
      endDate: result.subscription.endDate,
      amount: result.subscription.amount,
      currency: result.subscription.currency,
      status: result.subscription.status,
    },
    renewal: {
      mode: renewalContext.mode,
      payableAmount: renewalContext.payableAmount,
      upgradeCredit: renewalContext.upgradeCredit,
      remainingDays: renewalContext.remainingDays,
    },
    organization: {
      id: result.updatedOrganization.id,
      name: renewalContext.organization.name,
      organizationCode: renewalContext.organization.organizationCode,
      subscriptionStatus: result.updatedOrganization.subscriptionStatus,
      subscriptionExpiry: result.updatedOrganization.subscriptionExpiry,
    },
  });
});

// @desc    Verify Payment and Finalize Registration
// @route   POST /api/payment/verify-and-register
// @access  Public
exports.verifyAndRegister = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    organization,
    admin,
    plan,
  } = req.body;

  const adminEmail = normalizeEmail(admin?.email);
  const organizationEmail = normalizeEmail(organization?.email);

  let organizationPhone = null;
  let adminPhone = null;

  try {
    organizationPhone = normalizePhoneNumber({
      phone: organization?.phone,
      countryCode: organization?.phoneCountryCode || organization?.countryCode,
      requireCountryCode: true,
    });

    adminPhone = normalizePhoneNumber({
      phone: admin?.mobile,
      countryCode: admin?.mobileCountryCode || admin?.countryCode,
      requireCountryCode: true,
    });
  } catch (phoneError) {
    res.status(400);
    throw new Error(phoneError.message || "Invalid phone number format");
  }

  if (!organization || !admin || !plan) {
    res.status(400);
    throw new Error("Missing required registration data");
  }

  if (!adminEmail || !organizationEmail) {
    res.status(400);
    throw new Error("Admin email and organization email are required");
  }

  if (!admin.password) {
    res.status(400);
    throw new Error("Admin password is required");
  }

  if (!plan.code) {
    res.status(400);
    throw new Error("Plan code is required for registration");
  }

  const normalizedPlanCode = String(plan.code).toUpperCase().trim();
  const dbPlan = await prisma.plan.findUnique({ where: { code: normalizedPlanCode } });
  const fallbackPlan = FALLBACK_PLANS[normalizedPlanCode] || null;
  const resolvedPlan = dbPlan
    ? {
      code: dbPlan.code,
      name: dbPlan.name,
      price: dbPlan.price,
      durationInDays: dbPlan.durationInDays,
      currency: dbPlan.currency || "INR",
    }
    : fallbackPlan;

  if (!resolvedPlan) {
    res.status(404);
    throw new Error("Invalid or inactive plan");
  }

  if (isLegacyPaidMonthlyPlan(resolvedPlan)) {
    res.status(404);
    throw new Error("This plan is no longer available. Please choose a 3, 6, or 12 month plan.");
  }

  const freeTrialPlan = isFreeTrialPlan(resolvedPlan);

  if (!freeTrialPlan) {
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
      res.status(500);
      throw new Error("Razorpay secret key is missing on server");
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400);
      throw new Error("Payment details are required");
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      res.status(400);
      throw new Error("Invalid payment signature. Verification failed.");
    }
  } else {
    try {
      await ensureFreeTrialAvailable({
        orgEmail: organizationEmail,
        adminEmail,
        adminPhone: adminPhone.e164,
      });
    } catch (error) {
      res.status(error.statusCode || 500);
      throw new Error(error.message || "Unable to validate free trial eligibility.");
    }
  }

  const [userExists, organizationExists] = await Promise.all([
    prisma.user.findUnique({ where: { email: adminEmail } }),
    prisma.organization.findUnique({ where: { email: organizationEmail } }),
  ]);

  if (userExists) {
    res.status(409);
    throw new Error("An account with this email already exists.");
  }

  if (organizationExists) {
    res.status(409);
    throw new Error("An organization with this email already exists.");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (freeTrialPlan) {
        const existingTrial = await tx.freeTrialClaim.findFirst({
          where: {
            OR: [
              { orgEmail: organizationEmail },
              { adminEmail },
              { adminPhone: adminPhone.e164 },
            ],
          },
        });

        if (existingTrial) {
          const trialError = new Error("Free trial already used for this organization/admin.");
          trialError.statusCode = 409;
          throw trialError;
        }
      }

      const duration = resolvedPlan.durationInDays || 30;
      const planName = resolvedPlan.name || plan.name;
      const planAmount = Number(resolvedPlan.price || plan.price || 0);
      const trialReferenceId = freeTrialPlan
        ? `FREE_${Date.now()}_${Math.floor(Math.random() * 100000)}`
        : razorpay_order_id;
      const expiryDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      const { longitude, latitude } = parseCoordinates(organization);
      const organizationCode = await generateUniqueOrgCode(tx);

      const newOrg = await tx.organization.create({
        data: {
          organizationCode,
          name: truncateText(organization.name, 120) || "Organization",
          email: organizationEmail,
          phone: organizationPhone.e164,
          phoneCountryCode: organizationPhone.countryCode,
          address: truncateText(organization.address, 191) || null,
          city: truncateText(organization.city, 120) || null,
          state: truncateText(organization.state, 120) || null,
          country: organization.country || "India",
          longitude,
          latitude,
          subscriptionStatus: freeTrialPlan ? "TRIAL" : "ACTIVE",
          subscriptionExpiry: expiryDate,
          planId: dbPlan ? dbPlan.id : null,
          isActive: true,
        },
      });

      const hashedPassword = await bcrypt.hash(admin.password, 10);
      const adminRole = normalizeRole("ORG_ADMIN");
      const newUser = await tx.user.create({
        data: {
          name: truncateText(admin.name, 120) || "Admin User",
          email: adminEmail,
          mobile: adminPhone.e164,
          mobileCountryCode: adminPhone.countryCode,
          password: hashedPassword,
          role: adminRole,
          permissions: getDefaultPermissionsForRole(adminRole),
          orgId: newOrg.id,
          status: "APPROVED",
          isActive: true,
        },
      });

      await tx.subscription.updateMany({
        where: {
          orgId: newOrg.id,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
          activeKey: null,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          orgId: newOrg.id,
          planId: dbPlan ? dbPlan.id : null,
          planName,
          planCode: normalizedPlanCode,
          amount: planAmount,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: expiryDate,
          razorpayOrderId: freeTrialPlan ? trialReferenceId : razorpay_order_id,
          razorpayPaymentId: freeTrialPlan ? null : razorpay_payment_id,
          razorpaySignature: freeTrialPlan ? null : razorpay_signature,
          createdById: newUser.id,
          activeKey: `ORG_${newOrg.id}`,
        },
      });

      await tx.payment.create({
        data: {
          orgId: newOrg.id,
          userId: newUser.id,
          subscriptionId: subscription.id,
          planName,
          planCode: normalizedPlanCode,
          amount: planAmount,
          gateway: freeTrialPlan ? "FREE_TRIAL" : "RAZORPAY",
          razorpayOrderId: trialReferenceId || razorpay_order_id,
          razorpayPaymentId: freeTrialPlan ? null : razorpay_payment_id,
          razorpaySignature: freeTrialPlan ? null : razorpay_signature,
          status: "SUCCESS",
        },
      });

      await tx.organization.update({
        where: {
          id: newOrg.id,
        },
        data: {
          subscriptionId: subscription.id,
          orgAdminId: newUser.id,
        },
      });

      if (freeTrialPlan) {
        const trialStartDate = new Date();
        const trialEndDate = new Date(trialStartDate.getTime() + duration * 24 * 60 * 60 * 1000);
        // Use raw insert so registration is not blocked if Prisma client generation is stale.
        await tx.$executeRaw`
          INSERT INTO free_trial_claim (orgEmail, adminEmail, adminPhone, planCode, startDate, endDate, orgName, adminName)
          VALUES (
            ${organizationEmail},
            ${adminEmail},
            ${adminPhone.e164},
            ${normalizedPlanCode},
            ${trialStartDate},
            ${trialEndDate},
            ${truncateText(organization.name, 120) || null},
            ${truncateText(admin.name, 120) || null}
          )
        `;
      }

      return { newOrg, newUser };
    });

    let emailSent = false;

    try {
      const planDisplayName = resolvedPlan.name || (freeTrialPlan ? "Free Trial" : "Subscription Plan");
      const subStartDate = new Date();
      const subEndDate = new Date(result.newOrg.subscriptionExpiry);

      const emailMessage = `Hello ${result.newUser.name},

Thank you for registering your organization "${result.newOrg.name}" on Veagle Attendee.

Your Organization Code is: ${result.newOrg.organizationCode}

Subscription Details:
- Plan: ${planDisplayName}
- Status: ${freeTrialPlan ? "TRIAL" : "ACTIVE"}
- Start Date: ${formatDate(subStartDate)}
- Expiry Date: ${formatDate(subEndDate)}

You will need the Organization Code, along with your registered email and password, to log in to the system.

Best Regards,
Veagle Attendee Team`;

      const emailHtml = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 30px; border: 1px solid #eee; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0; font-size: 28px;">Welcome to Veagle Attendee!</h2>
            <p style="color: #666; font-size: 16px;">Your workspace is ready.</p>
          </div>

          <p>Hello <strong>${result.newUser.name}</strong>,</p>
          <p>Thank you for registering your organization "<strong>${result.newOrg.name}</strong>". We are excited to have you on board.</p>

          <div style="background-color: #f9f9f9; padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center; border: 1px dashed #4CAF50;">
            <p style="margin: 0; font-size: 14px; color: #777; text-transform: uppercase; letter-spacing: 1px;">Your Organization Code</p>
            <h1 style="color: #222; margin: 10px 0; letter-spacing: 5px; font-size: 36px; font-weight: 800;">${result.newOrg.organizationCode}</h1>
            <p style="margin: 0; font-size: 13px; color: #999;">Keep this code safe. You will need it to log in.</p>
          </div>

          <div style="margin: 25px 0; padding: 20px; background-color: #fff; border: 1px solid #eee; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #444; border-bottom: 1px solid #eee; padding-bottom: 10px; font-size: 18px;">Subscription Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #666;">Plan Name:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${planDisplayName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Status:</td>
                <td style="padding: 8px 0; text-align: right;"><span style="background-color: ${freeTrialPlan ? "#fff3cd" : "#d4edda"}; color: ${freeTrialPlan ? "#856404" : "#155724"}; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: bold;">${freeTrialPlan ? "TRIAL" : "ACTIVE"}</span></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Start Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600;">${formatDate(subStartDate)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #666;">Expiry Date:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #e74c3c;">${formatDate(subEndDate)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 15px; line-height: 1.5;">You and your team members will need the <strong>Organization Code</strong> as a primary identifier to access your specific workspace.</p>

          <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            <p style="font-size: 14px; color: #888; margin: 0;">
              Best Regards,<br/>
              <strong style="color: #333;">Veagle Attendee Pvt Ltd</strong>
            </p>
          </div>
        </div>
      `;

      await sendEmail({
        email: result.newUser.email,
        subject: `Welcome to Veagle Attendee - ${result.newOrg.organizationCode}`,
        message: emailMessage,
        html: emailHtml,
      });
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send registration email:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Registration completed successfully.",
      emailSent,
      user: {
        id: result.newUser.id,
        name: result.newUser.name,
        email: result.newUser.email,
      },
    });
  } catch (dbError) {
    console.error("DB Error during registration:", dbError);

    if (dbError?.statusCode) {
      res.status(dbError.statusCode);
      throw new Error(dbError.message || "Registration failed.");
    }

    const mapped = classifyDbError(dbError);
    if (mapped) {
      res.status(mapped.status);
      throw new Error(mapped.message);
    }

    res.status(500);
    throw new Error(
      process.env.NODE_ENV === "production"
        ? "Failed to finalize registration. Please contact support with your payment ID."
        : `Failed to finalize registration: ${dbError?.message || "Unknown error"}`
    );
  }
});

// @desc    Archive Failed Registration Attempt
// @route   POST /api/payment/archive-failed-registration
// @access  Public
exports.archiveFailedRegistrationAttempt = asyncHandler(async (req, res) => {
  const { organization, admin, reason, metadata } = req.body;

  if (!organization || !admin) {
    res.status(400);
    throw new Error("Organization and admin details are required for archiving");
  }

  const results = await archiveFailedRegistration({
    organization,
    admin,
    reason: reason || "User abandoned or registration failed",
    metadata: metadata || {},
  });

  if (!results) {
    res.status(500);
    throw new Error("Failed to archive registration attempt");
  }

  res.status(200).json({
    success: true,
    message: "Registration attempt archived successfully",
    archivedId: results.archivedOrg.id,
  });
});
