// Deployment Trigger - Migration Fixed
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { normalizeRole } = require("../constants/rbac");
const { normalizeEmail, normalizePhoneNumber } = require("../utils/contact");
const { generateUniqueOrgCode } = require("../utils/org-code");
const { generateUniqueReferralCode } = require("../utils/referral-code");
const { isLegacyPaidMonthlyPlan } = require("../services/plan.service");
const { CLIENT_BASE_URL } = require("../config");
const { createOrganizationMembership } = require("../services/organization-member.service");
const { archiveFailedRegistration } = require("../services/archive.service");
const sendEmail = require("../utils/email");
const { buildEmailTemplate } = require("../utils/email-template");
const { truncateText, formatDate } = require("../services/common.service");

// -- PayU helpers --------------------------------------------------------------
const getPayuCredentials = () => ({
  merchantKey: process.env.PAYU_MERCHANT_KEY || "",
  merchantSalt: process.env.PAYU_MERCHANT_SALT || "",
  baseUrl: process.env.PAYU_BASE_URL || "https://test.payu.in/_payment",
});

const getClientBaseUrl = () => {
  const url = String(process.env.CLIENT_URL || process.env.APP_URL || "").trim();
  if (url) return url.replace(/\/+$/, "");
  const first = String(process.env.CLIENT_ORIGINS || "").split(",").map(v => v.trim()).find(Boolean);
  return first ? first.replace(/\/+$/, "") : CLIENT_BASE_URL;
};

const getServerBaseUrl = () =>
  String(process.env.SERVER_BASE_URL || "http://localhost:5000").replace(/\/+$/, "");

const generatePayuHash = ({ key, txnid, amount, productinfo, firstname, email, udf1 = "", salt }) => {
  const str = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|${udf1}||||||||||${salt}`;
  return crypto.createHash("sha512").update(str).digest("hex");
};

const verifyPayuHash = ({ key, txnid, amount, productinfo, firstname, email, udf1 = "", status, hash, salt }) => {
  const str = `${salt}|${status}||||||||||${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}|${key}`;
  const expected = crypto.createHash("sha512").update(str).digest("hex");
  return expected === String(hash || "");
};

const generateTxnId = () => `TXN_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

// In-memory store for pending registrations (keyed by txnid)
const pendingRegistrations = new Map();

// -- Constants -----------------------------------------------------------------
const FALLBACK_PLANS = {
  BASIC: { code: "BASIC", name: "Basic", price: 999, currency: "INR", durationInDays: 30 },
  PRO: { code: "PRO", name: "Pro", price: 1999, currency: "INR", durationInDays: 30 },
  ADVANCED: { code: "ADVANCED", name: "Advanced", price: 2999, currency: "INR", durationInDays: 30 },
};
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const RENEWAL_INTENT_TTL_MS = 30 * 60 * 1000;
const PAYMENT_GATEWAYS = Object.freeze({ PAYU: "PAYU", PLAN_CREDIT: "PLAN_CREDIT", FREE_TRIAL: "FREE_TRIAL" });
const RENEWAL_MODES = Object.freeze({ RENEW: "RENEW", EXTEND: "EXTEND", UPGRADE_NOW: "UPGRADE_NOW", DOWNGRADE_SCHEDULED: "DOWNGRADE_SCHEDULED" });
const RENEWAL_INTENT_MUTABLE_STATUSES = new Set(["CREATED", "VERIFIED"]);

// -- Shared utilities ----------------------------------------------------------
const roundMoney = (v) => Math.max(0, Number(Number(v || 0).toFixed(2)));
const parseCoordinates = (org = {}) => {
  const c = org.location;
  if (c && Array.isArray(c.coordinates) && c.coordinates.length === 2) {
    const lon = Number(c.coordinates[0]), lat = Number(c.coordinates[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { longitude: lon, latitude: lat };
  }
  if (Array.isArray(org.orgLocation) && org.orgLocation.length === 2) {
    const lon = Number(org.orgLocation[0]), lat = Number(org.orgLocation[1]);
    if (Number.isFinite(lon) && Number.isFinite(lat)) return { longitude: lon, latitude: lat };
  }
  return { longitude: 0, latitude: 0 };
};
const isFreeTrialPlan = (plan = {}) => String(plan.code || "").toUpperCase().includes("FREE") || Number(plan.price || 0) <= 0;
const parseIntentId = (v) => { const p = Number(v); return Number.isFinite(p) && p > 0 ? Math.floor(p) : null; };
const getRemainingMs = (endDate, now = new Date()) => { const e = new Date(endDate || 0); return (!isNaN(e) && e > now) ? e - now : 0; };
const createInternalOrderId = ({ orgId, mode = "RENEW" }) => `INTENT_${mode}_${orgId}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

const calculateProratedCredit = (sub, now = new Date()) => {
  if (!sub?.startDate || !sub?.endDate) return 0;
  const start = new Date(sub.startDate), end = new Date(sub.endDate), amount = Number(sub.amount || 0);
  if (isNaN(start) || isNaN(end) || end <= now || amount <= 0) return 0;
  const totalMs = Math.max(end - start, DAY_IN_MS);
  return roundMoney(amount * (getRemainingMs(end, now) / totalMs));
};

const resolvePlanForCheckout = async (planCode) => {
  const code = String(planCode || "").toUpperCase().trim();
  if (!code) { const e = new Error("Plan code is required"); e.statusCode = 400; throw e; }
  const dbPlan = await prisma.plan.findFirst({ where: { code, isActive: true } });
  const fallback = FALLBACK_PLANS[code] || null;
  const plan = dbPlan ? { code: dbPlan.code, id: dbPlan.id, name: dbPlan.name, price: dbPlan.price, durationInDays: dbPlan.durationInDays, currency: dbPlan.currency || "INR" } : fallback;
  if (!plan) { const e = new Error("Invalid or inactive plan"); e.statusCode = 404; throw e; }
  if (isLegacyPaidMonthlyPlan(plan)) { const e = new Error("This plan is no longer available."); e.statusCode = 404; throw e; }
  return { code, dbPlan, plan, freeTrialPlan: isFreeTrialPlan(plan) };
};

const ensureFreeTrialAvailable = async ({ orgEmail, adminEmail, adminPhone }) => {
  const existing = await prisma.freeTrialClaim.findFirst({ where: { OR: [{ orgEmail }, { adminEmail }, ...(adminPhone ? [{ adminPhone }] : [])] } });
  if (existing) { const e = new Error("Free trial already used for this organization/admin."); e.statusCode = 409; throw e; }
};

const assertOnboardingIdentityAvailable = async ({ adminEmail, organizationEmail }) => {
  if (!adminEmail || !organizationEmail) return;
  const [u, o] = await Promise.all([prisma.user.findUnique({ where: { email: adminEmail } }), prisma.organization.findUnique({ where: { email: organizationEmail } })]);
  if (u) { const e = new Error("An account with this email already exists."); e.statusCode = 409; throw e; }
  if (o) { const e = new Error("An organization with this email already exists."); e.statusCode = 409; throw e; }
};

const classifyDbError = (err) => {
  if (!err || typeof err !== "object") return null;
  if (err.code === "P2002") {
    const t = Array.isArray(err?.meta?.target) ? err.meta.target.join(",") : String(err?.meta?.target || "");
    if (t.includes("orgEmail") || t.includes("adminEmail") || t.includes("adminPhone")) return { status: 409, message: "Free trial already used." };
    if (t.toLowerCase().includes("email")) return { status: 409, message: "Email already exists." };
    return { status: 409, message: "Duplicate data found." };
  }
  if (err.code === "P2003") return { status: 400, message: "Invalid reference data." };
  if (err.code === "P2000") return { status: 400, message: "Some field values are too long." };
  return null;
};

// -- GET /api/payment/get-key --------------------------------------------------
exports.getPublicKey = asyncHandler(async (req, res) => {
  const { merchantKey, baseUrl } = getPayuCredentials();
  if (!merchantKey) { res.status(500); throw new Error("PayU merchant key is missing in server environment"); }
  res.status(200).json({ success: true, key: merchantKey, baseUrl });
});

// -- POST /api/payment/create-order -------------------------------------------
exports.createOrder = asyncHandler(async (req, res) => {
  const { planCode, organization, admin } = req.body || {};
  const orgEmail = normalizeEmail(organization?.email);
  const adminEmail = normalizeEmail(admin?.email);
  const { dbPlan, plan, freeTrialPlan } = await resolvePlanForCheckout(planCode);
  try { await assertOnboardingIdentityAvailable({ adminEmail, organizationEmail: orgEmail }); }
  catch (err) { res.status(err.statusCode || 409); throw new Error(err.message || "Duplicate account details."); }

  if (freeTrialPlan) {
    if (!orgEmail || !adminEmail) { res.status(400); throw new Error("Org and admin details required for free trial."); }
    let adminPhone = null;
    try { adminPhone = normalizePhoneNumber({ phone: admin?.mobile, countryCode: admin?.mobileCountryCode || admin?.countryCode, requireCountryCode: true }).e164; } catch {}
    try { await ensureFreeTrialAvailable({ orgEmail, adminEmail, adminPhone }); }
    catch (err) { res.status(err.statusCode || 500); throw new Error(err.message); }
    return res.status(200).json({ success: true, freeTrial: true, order: null, plan: { code: plan.code, name: plan.name, price: plan.price, durationInDays: plan.durationInDays || 7 }, source: dbPlan ? "DB" : "FALLBACK" });
  }

  const { merchantKey, merchantSalt, baseUrl } = getPayuCredentials();
  if (!merchantKey || !merchantSalt) { res.status(500); throw new Error("PayU credentials missing on server"); }

  const txnid = generateTxnId();
  const amount = Number(plan.price).toFixed(2);
  const productinfo = `${plan.name} Plan`;
  const firstname = String(admin?.name || "Customer").split(" ")[0];
  const email = adminEmail || String(admin?.email || "");
  const phone = admin?.mobile || "";
  const udf1 = txnid; // echo back for verification
  const hash = generatePayuHash({ key: merchantKey, txnid, amount, productinfo, firstname, email, udf1, salt: merchantSalt });
  const successUrl = `${getServerBaseUrl()}/api/payment/payu-success`;
  const failureUrl = `${getServerBaseUrl()}/api/payment/payu-failure`;

  // Store registration data in memory keyed by txnid (30 min TTL)
  pendingRegistrations.set(txnid, { organization, admin, plan: { code: plan.code, name: plan.name, price: plan.price, durationInDays: plan.durationInDays }, expiresAt: Date.now() + RENEWAL_INTENT_TTL_MS });
  setTimeout(() => pendingRegistrations.delete(txnid), RENEWAL_INTENT_TTL_MS);

  res.status(200).json({
    success: true, freeTrial: false,
    payuParams: { key: merchantKey, txnid, amount, productinfo, firstname, email, phone, udf1, surl: successUrl, furl: failureUrl, hash },
    baseUrl,
    plan: { code: plan.code, name: plan.name, price: plan.price, durationInDays: plan.durationInDays },
    source: dbPlan ? "DB" : "FALLBACK",
  });
});

// -- POST /api/payment/payu-success (PayU callback) ---------------------------
exports.payuSuccess = asyncHandler(async (req, res) => {
  console.log("[PayU Success Callback] Body:", JSON.stringify(req.body));
  const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, udf1 } = req.body || {};
  const clientBase = getClientBaseUrl();
  const failRedirect = (msg) => {
    console.error("[PayU Success Callback] Failure:", msg);
    return res.redirect(`${clientBase}/register/organisation/payment?payustatus=failed&reason=${encodeURIComponent(msg)}`);
  };

  const { merchantKey, merchantSalt } = getPayuCredentials();
  if (!merchantKey || !merchantSalt) return failRedirect("Server configuration error");

  const isValid = verifyPayuHash({ key: merchantKey, txnid, amount, productinfo, firstname, email, udf1, status, hash, salt: merchantSalt });
  if (!isValid) return failRedirect("Invalid payment signature");
  if (String(status || "").toLowerCase() !== "success") return failRedirect("Payment was not successful");

  const pending = pendingRegistrations.get(txnid);
  if (!pending) return failRedirect("Registration session expired. Please try again.");
  if (Date.now() > pending.expiresAt) { pendingRegistrations.delete(txnid); return failRedirect("Registration session expired."); }

  console.log("[PayU Success Callback] Processing registration for txnid:", txnid);
  const { organization, admin, plan } = pending;
  const adminEmail = normalizeEmail(admin?.email);
  const organizationEmail = normalizeEmail(organization?.email);
  let organizationPhone, adminPhone;
  try {
    organizationPhone = normalizePhoneNumber({ phone: organization?.phone, countryCode: organization?.phoneCountryCode || organization?.countryCode, requireCountryCode: true });
    adminPhone = normalizePhoneNumber({ phone: admin?.mobile, countryCode: admin?.mobileCountryCode || admin?.countryCode, requireCountryCode: true });
  } catch (err) { return failRedirect("Invalid phone number: " + err.message); }

  const normalizedPlanCode = String(plan.code).toUpperCase().trim();
  const dbPlan = await prisma.plan.findUnique({ where: { code: normalizedPlanCode } });
  const resolvedPlan = dbPlan ? { code: dbPlan.code, name: dbPlan.name, price: dbPlan.price, durationInDays: dbPlan.durationInDays, currency: dbPlan.currency || "INR" } : plan;

  try {
    const [userExists, orgExists] = await Promise.all([prisma.user.findUnique({ where: { email: adminEmail } }), prisma.organization.findUnique({ where: { email: organizationEmail } })]);
    if (userExists || orgExists) return failRedirect("Account already exists. Please login.");

    console.log("[PayU Success Callback] Starting DB Transaction...");
    await prisma.$transaction(async (tx) => {
      const duration = resolvedPlan.durationInDays || 30;
      const expiryDate = new Date(Date.now() + duration * DAY_IN_MS);
      const { longitude, latitude } = parseCoordinates(organization);
      const organizationCode = await generateUniqueOrgCode(tx);
      const referralCode = await generateUniqueReferralCode(tx);
      
      console.log("[PayU Success Callback] Creating organization...");
      const newOrg = await tx.organization.create({ data: { organizationCode, referralCode, name: truncateText(organization.name, 120) || "Organization", email: organizationEmail, phone: organizationPhone.e164, phoneCountryCode: organizationPhone.countryCode, address: truncateText(organization.address, 191) || null, city: truncateText(organization.city, 120) || null, state: truncateText(organization.state, 120) || null, country: organization.country || "India", longitude, latitude, subscriptionStatus: "ACTIVE", subscriptionExpiry: expiryDate, planId: dbPlan ? dbPlan.id : null, isActive: true } });
      
      console.log("[PayU Success Callback] Hashing password...");
      const hashedPw = await bcrypt.hash(admin.password, 10);
      const adminRole = normalizeRole("ORG_ADMIN");
      
      console.log("[PayU Success Callback] Creating user...");
      const newUser = await tx.user.create({ data: { name: truncateText(admin.name, 120) || "Admin User", email: adminEmail, mobile: adminPhone.e164, mobileCountryCode: adminPhone.countryCode, password: hashedPw, role: adminRole, orgId: newOrg.id, status: "APPROVED", isActive: true } });
      await createOrganizationMembership(tx, { userId: newUser.id, orgId: newOrg.id, role: adminRole, isActive: true });
      
      console.log("[PayU Success Callback] Creating subscription...");
      const sub = await tx.subscription.create({ data: { orgId: newOrg.id, planId: dbPlan ? dbPlan.id : null, planName: resolvedPlan.name, planCode: normalizedPlanCode, amount: Number(resolvedPlan.price), currency: resolvedPlan.currency || "INR", status: "ACTIVE", startDate: new Date(), endDate: expiryDate, paymentGateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, createdById: newUser.id, activeKey: `ORG_${newOrg.id}` } });
      
      console.log("[PayU Success Callback] Creating payment record...");
      await tx.payment.create({ data: { orgId: newOrg.id, userId: newUser.id, subscriptionId: sub.id, planName: resolvedPlan.name, planCode: normalizedPlanCode, amount: Number(resolvedPlan.price), currency: resolvedPlan.currency || "INR", gateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, rawResponse: req.body || {}, status: "SUCCESS" } });
      await tx.organization.update({ where: { id: newOrg.id }, data: { subscriptionId: sub.id, orgAdminId: newUser.id } });
    });

    console.log("[PayU Success Callback] Transaction committed successfully.");
    pendingRegistrations.delete(txnid);
    try {
      console.log("[PayU Success Callback] Sending welcome email...");
      await sendEmail({
        email: adminEmail,
        subject: `Welcome to Veagle Attendee - ${truncateText(newOrg.name, 40)}`,
        greeting: `Hello ${admin.name},`,
        intro: [
          "Congratulations! Your organization has been successfully registered on Veagle Attendee.",
          "Your workspace is now active and ready for use. Below are your account and subscription details.",
        ],
        sections: [
          {
            eyebrow: "Account Details",
            title: "Organization Workspace",
            rows: [
              { label: "Org Name", value: newOrg.name },
              { label: "Org Code", value: newOrg.organizationCode },
              { label: "Referral Code", value: newOrg.referralCode },
              { label: "Join Link", valueHtml: `<a href="${clientBase}/register/user?ref=${newOrg.referralCode}" style="color:#7dd3fc;text-decoration:underline;word-break:break-all;">${clientBase}/register/user?ref=${newOrg.referralCode}</a>` },
              { label: "Admin", value: admin.name },
              { label: "Admin Email", value: adminEmail },
            ],
          },
          {
            eyebrow: "Subscription Info",
            title: resolvedPlan.name,
            rows: [
              { label: "Status", value: "ACTIVE" },
              { label: "Amount Paid", value: `${resolvedPlan.currency || "INR"} ${Number(resolvedPlan.price).toLocaleString("en-IN")}` },
              { label: "Start Date", value: new Date().toLocaleDateString("en-GB") },
              { label: "Expiry Date", value: expiryDate.toLocaleDateString("en-GB") },
            ],
          },
        ],
        action: {
          label: "Go to Login",
          href: `${clientBase}/login`,
        },
        footnotes: [
          "Please keep your Organization Code safe. You and your team members will need it to login to the system.",
          "For security reasons, your password is not included in this email.",
        ],
        footerNote: "Empowering your workspace with smart attendance solutions.",
      });
    } catch (e) {
      console.error("[PayU Success Callback] Email error (non-fatal):", e);
    }
    
    res.redirect(`${clientBase}/register/organisation/payment?payustatus=success&txnid=${txnid}`);
  } catch (err) {
    console.error("[PayU Success Callback] Error during processing:", err);
    res.redirect(`${clientBase}/register/organisation/payment?payustatus=failed&reason=${encodeURIComponent(err.message || "Registration failed")}`);
  }
});


// -- POST /api/payment/payu-failure (PayU callback) ---------------------------
exports.payuFailure = asyncHandler(async (req, res) => {
  const { txnid } = req.body || {};
  if (txnid) pendingRegistrations.delete(txnid);
  const clientBase = getClientBaseUrl();
  res.redirect(`${clientBase}/register/organisation/payment?payustatus=failed&reason=${encodeURIComponent("Payment failed or was cancelled")}`);
});

// -- Renewal helpers -----------------------------------------------------------
const resolveRenewalContext = async ({ organizationId, planCode }) => {
  const org = await prisma.organization.findUnique({ where: { id: Number(organizationId) }, include: { plan: { select: { id: true, name: true, code: true, price: true, durationInDays: true, currency: true } } } });
  if (!org) { const e = new Error("Organization not found"); e.statusCode = 404; throw e; }
  const { code, dbPlan, plan, freeTrialPlan } = await resolvePlanForCheckout(planCode);
  const now = new Date();
  const activeSub = await prisma.subscription.findFirst({ where: { orgId: Number(organizationId), status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } }, orderBy: [{ endDate: "desc" }, { createdAt: "desc" }] });
  const remainingMs = getRemainingMs(activeSub?.endDate, now);
  const remainingDays = remainingMs > 0 ? Math.ceil(remainingMs / DAY_IN_MS) : 0;
  const curCode = String(activeSub?.planCode || org.plan?.code || "").trim().toUpperCase();
  const curPrice = roundMoney(Number(activeSub?.amount || org.plan?.price || 0));
  const selPrice = roundMoney(Number(plan.price || 0));
  const hasActive = Boolean(activeSub && remainingMs > 0);
  const samePlan = hasActive && curCode === code;
  let mode = RENEWAL_MODES.RENEW;
  if (hasActive) { if (samePlan) mode = RENEWAL_MODES.EXTEND; else if (selPrice < curPrice) mode = RENEWAL_MODES.DOWNGRADE_SCHEDULED; else mode = RENEWAL_MODES.UPGRADE_NOW; }
  const upgradeCredit = mode === RENEWAL_MODES.UPGRADE_NOW ? calculateProratedCredit(activeSub, now) : 0;
  const payableAmount = roundMoney(mode === RENEWAL_MODES.UPGRADE_NOW ? Math.max(selPrice - upgradeCredit, 0) : selPrice);
  const durationInDays = Number(plan.durationInDays || 0) || 30;
  const effectiveStartDate = (mode === RENEWAL_MODES.EXTEND || mode === RENEWAL_MODES.DOWNGRADE_SCHEDULED) && activeSub?.endDate ? new Date(activeSub.endDate) : now;
  const expiryDate = new Date(effectiveStartDate.getTime() + durationInDays * DAY_IN_MS);
  return { org, activeSub, code, dbPlan, plan, freeTrialPlan, mode, upgradeCredit, payableAmount, remainingDays, curPrice, selPrice, hasActive, curCode, currentExpiry: activeSub?.endDate || org.subscriptionExpiry || null, effectiveStartDate, durationInDays, now, expiryDate };
};

const createRenewalIntent = async ({ organizationId, userId, ctx, gatewayOrderId = null }) => {
  const now = new Date();
  const fallbackId = createInternalOrderId({ orgId: organizationId, mode: ctx.mode });
  const resolvedOrderId = String(gatewayOrderId || fallbackId);
  return prisma.subscriptionRenewalIntent.create({ data: { orgId: Number(organizationId), userId: Number(userId), planId: ctx.dbPlan?.id || null, currentSubscriptionId: ctx.activeSub?.id || null, planName: ctx.plan.name, planCode: ctx.code, currentPlanName: ctx.activeSub?.planName || ctx.org.plan?.name || null, currentPlanCode: ctx.curCode || null, mode: ctx.mode, status: "CREATED", payableAmount: roundMoney(ctx.payableAmount), creditAmount: roundMoney(ctx.upgradeCredit), currency: ctx.plan.currency || "INR", remainingDays: Number(ctx.remainingDays || 0), expectedStartDate: ctx.effectiveStartDate, expectedEndDate: ctx.expiryDate, gateway: ctx.payableAmount > 0 ? PAYMENT_GATEWAYS.PAYU : PAYMENT_GATEWAYS.PLAN_CREDIT, paymentOrderId: resolvedOrderId, expiresAt: ctx.payableAmount > 0 ? new Date(now.getTime() + RENEWAL_INTENT_TTL_MS) : null, metadata: { source: "create-renewal-order", renewal: { mode: ctx.mode, hasActiveSub: ctx.hasActive, currentExpiry: ctx.currentExpiry } } } });
};

// -- POST /api/payment/create-renewal-order ------------------------------------
exports.createRenewalOrder = asyncHandler(async (req, res) => {
  const { planCode } = req.body || {};
  const organizationId = Number(req.user?.organizationId || req.user?.organization);
  const userId = Number(req.user?.id);
  if (!organizationId || !userId) { res.status(403); throw new Error("Organization context missing"); }

  const ctx = await resolveRenewalContext({ organizationId, planCode });
  if (ctx.org.isBlocked || ctx.org.isActive === false || ctx.org.deletedAt) { res.status(403); throw new Error("Organization access is blocked"); }
  if (ctx.freeTrialPlan) { res.status(400); throw new Error("Existing organizations cannot renew with a free trial plan."); }

  await prisma.subscriptionRenewalIntent.updateMany({ where: { orgId: organizationId, userId, status: { in: ["CREATED", "VERIFIED"] } }, data: { status: "CANCELLED" } });

  if (ctx.payableAmount <= 0) {
    const intent = await createRenewalIntent({ organizationId, userId, ctx });
    return res.status(200).json({ success: true, freeRenewal: true, intentId: intent.id, intentStatus: intent.status, order: null, plan: { code: ctx.plan.code, name: ctx.plan.name, price: ctx.plan.price, payableAmount: 0, upgradeCredit: ctx.upgradeCredit, durationInDays: ctx.durationInDays, currency: ctx.plan.currency || "INR" }, renewal: { mode: ctx.mode, remainingDays: ctx.remainingDays, currentExpiry: ctx.currentExpiry, nextExpiry: ctx.expiryDate } });
  }

  const { merchantKey, merchantSalt, baseUrl } = getPayuCredentials();
  if (!merchantKey || !merchantSalt) { res.status(500); throw new Error("PayU credentials missing on server"); }

  const txnid = generateTxnId();
  const amount = ctx.payableAmount.toFixed(2);
  const productinfo = `${ctx.plan.name} Renewal`;
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, mobile: true } });
  const firstname = String(userRecord?.name || "Customer").split(" ")[0];
  const email = String(userRecord?.email || "");
  const intent = await createRenewalIntent({ organizationId, userId, ctx, gatewayOrderId: txnid });
  const udf1 = String(intent.id);
  const hash = generatePayuHash({ key: merchantKey, txnid, amount, productinfo, firstname, email, udf1, salt: merchantSalt });
  const successUrl = `${getServerBaseUrl()}/api/payment/payu-renewal-success`;
  const failureUrl = `${getServerBaseUrl()}/api/payment/payu-renewal-failure`;

  res.status(200).json({ success: true, freeRenewal: false, intentId: intent.id, intentStatus: intent.status, intentExpiresAt: intent.expiresAt, payuParams: { key: merchantKey, txnid, amount, productinfo, firstname, email, phone: userRecord?.mobile || "", udf1, surl: successUrl, furl: failureUrl, hash }, baseUrl, plan: { code: ctx.plan.code, name: ctx.plan.name, price: ctx.plan.price, payableAmount: ctx.payableAmount, upgradeCredit: ctx.upgradeCredit, durationInDays: ctx.durationInDays, currency: ctx.plan.currency || "INR" }, renewal: { mode: ctx.mode, remainingDays: ctx.remainingDays, currentExpiry: ctx.currentExpiry, nextExpiry: ctx.expiryDate, currentPlanPrice: ctx.curPrice, selectedPlanPrice: ctx.selPrice } });
});

// -- POST /api/payment/payu-renewal-success -----------------------------------
exports.payuRenewalSuccess = asyncHandler(async (req, res) => {
  const { txnid, mihpayid, status, hash, amount, productinfo, firstname, email, udf1 } = req.body || {};
  const clientBase = getClientBaseUrl();
  const fail = (msg) => res.redirect(`${clientBase}/pricing?payustatus=failed&reason=${encodeURIComponent(msg)}`);
  const { merchantKey, merchantSalt } = getPayuCredentials();
  const isValid = verifyPayuHash({ key: merchantKey, txnid, amount, productinfo, firstname, email, udf1, status, hash, salt: merchantSalt });
  if (!isValid) return fail("Invalid payment signature");
  if (String(status || "").toLowerCase() !== "success") return fail("Payment was not successful");
  const intentId = parseIntentId(udf1);
  if (!intentId) return fail("Invalid renewal session");
  const intent = await prisma.subscriptionRenewalIntent.findUnique({ where: { id: intentId }, include: { organization: true } });
  if (!intent) return fail("Renewal session not found");
  if (!RENEWAL_INTENT_MUTABLE_STATUSES.has(intent.status)) return res.redirect(`${clientBase}/pricing?payustatus=success`);
  const now = new Date();
  if (intent.expiresAt && new Date(intent.expiresAt) < now) { await prisma.subscriptionRenewalIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } }); return fail("Renewal session expired"); }

  try {
    await prisma.$transaction(async (tx) => {
      const payableAmt = roundMoney(intent.payableAmount);
      const expStart = new Date(intent.expectedStartDate), expEnd = new Date(intent.expectedEndDate);
      const mode = String(intent.mode || RENEWAL_MODES.RENEW).toUpperCase();
      let sub;
      if (mode === RENEWAL_MODES.EXTEND) {
        sub = await tx.subscription.update({ where: { id: intent.currentSubscriptionId }, data: { endDate: expEnd, paymentGateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, activeKey: `ORG_${intent.orgId}` } });
        await tx.organization.update({ where: { id: intent.orgId }, data: { subscriptionStatus: "ACTIVE", subscriptionExpiry: expEnd, subscriptionId: sub.id } });
      } else if (mode === RENEWAL_MODES.DOWNGRADE_SCHEDULED) {
        await tx.subscription.updateMany({ where: { orgId: intent.orgId, status: "ACTIVE", startDate: { gt: now }, activeKey: null }, data: { status: "CANCELLED" } });
        sub = await tx.subscription.create({ data: { orgId: intent.orgId, planId: intent.planId || null, planName: intent.planName, planCode: intent.planCode, amount: roundMoney(Number(intent.payableAmount) + Number(intent.creditAmount)), currency: intent.currency || "INR", status: "ACTIVE", startDate: expStart, endDate: expEnd, paymentGateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, createdById: intent.userId, activeKey: null } });
      } else {
        await tx.subscription.updateMany({ where: { orgId: intent.orgId, status: "ACTIVE", startDate: { lte: now } }, data: { status: "EXPIRED", activeKey: null } });
        sub = await tx.subscription.create({ data: { orgId: intent.orgId, planId: intent.planId || null, planName: intent.planName, planCode: intent.planCode, amount: roundMoney(Number(intent.payableAmount) + Number(intent.creditAmount)), currency: intent.currency || "INR", status: "ACTIVE", startDate: expStart, endDate: expEnd, paymentGateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, createdById: intent.userId, activeKey: `ORG_${intent.orgId}` } });
        await tx.organization.update({ where: { id: intent.orgId }, data: { planId: intent.planId || null, subscriptionStatus: "ACTIVE", subscriptionExpiry: expEnd, subscriptionId: sub.id } });
      }
      await tx.payment.create({ data: { orgId: intent.orgId, userId: intent.userId, subscriptionId: sub.id, planName: intent.planName, planCode: intent.planCode, amount: payableAmt, currency: intent.currency || "INR", gateway: PAYMENT_GATEWAYS.PAYU, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, rawResponse: req.body || undefined, status: "SUCCESS" } });
      await tx.subscriptionRenewalIntent.update({ where: { id: intent.id }, data: { status: "APPLIED", verifiedAt: now, appliedAt: now, appliedSubscriptionId: sub.id, paymentOrderId: txnid, paymentReferenceId: mihpayid || null, gateway: PAYMENT_GATEWAYS.PAYU } });
    });
    res.redirect(`${clientBase}/pricing?payustatus=success`);
  } catch (err) {
    console.error("PayU renewal error:", err);
    res.redirect(`${clientBase}/pricing?payustatus=failed&reason=${encodeURIComponent(err.message || "Renewal failed")}`);
  }
});

// -- POST /api/payment/payu-renewal-failure -----------------------------------
exports.payuRenewalFailure = asyncHandler(async (req, res) => {
  const clientBase = getClientBaseUrl();
  res.redirect(`${clientBase}/pricing?payustatus=failed&reason=${encodeURIComponent("Payment failed or was cancelled")}`);
});

// -- POST /api/payment/verify-renewal (free/credit renewals) ------------------
exports.verifyRenewal = asyncHandler(async (req, res) => {
  const { intentId: rawId, planCode } = req.body || {};
  const organizationId = Number(req.user?.organizationId || req.user?.organization);
  const userId = Number(req.user?.id);
  if (!organizationId || !userId) { res.status(403); throw new Error("Organization context missing"); }
  const intentId = parseIntentId(rawId);
  if (!intentId) { res.status(400); throw new Error("Renewal intent id is required"); }

  const [user, intent] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.subscriptionRenewalIntent.findFirst({ where: { id: intentId, orgId: organizationId, userId }, include: { organization: true } }),
  ]);
  if (!user) { res.status(404); throw new Error("User not found"); }
  if (!intent) { res.status(404); throw new Error("Renewal intent not found"); }
  if (intent.organization.isBlocked || intent.organization.isActive === false || intent.organization.deletedAt) { res.status(403); throw new Error("Organization access is blocked"); }
  if (planCode && String(planCode).trim().toUpperCase() !== String(intent.planCode).trim().toUpperCase()) { res.status(409); throw new Error("Plan mismatch"); }
  if (intent.status === "APPLIED") {
    const [sub, org] = await Promise.all([intent.appliedSubscriptionId ? prisma.subscription.findUnique({ where: { id: intent.appliedSubscriptionId } }) : null, prisma.organization.findUnique({ where: { id: organizationId } })]);
    return res.status(200).json({ success: true, message: "Subscription renewed.", idempotent: true, subscription: sub ? { id: sub.id, planName: sub.planName, planCode: sub.planCode, startDate: sub.startDate, endDate: sub.endDate, amount: sub.amount, currency: sub.currency, status: sub.status } : null, organization: org ? { id: org.id, name: org.name, organizationCode: org.organizationCode, subscriptionStatus: org.subscriptionStatus, subscriptionExpiry: org.subscriptionExpiry } : null });
  }
  if (!RENEWAL_INTENT_MUTABLE_STATUSES.has(intent.status)) { res.status(409); throw new Error(`Renewal intent is ${intent.status.toLowerCase()}.`); }
  const now = new Date();
  if (intent.expiresAt && new Date(intent.expiresAt) < now) { await prisma.subscriptionRenewalIntent.update({ where: { id: intent.id }, data: { status: "EXPIRED" } }); res.status(410); throw new Error("Session expired."); }
  if (roundMoney(intent.payableAmount) > 0) { res.status(400); throw new Error("This intent requires payment. Please use the payment gateway."); }

  const expStart = new Date(intent.expectedStartDate), expEnd = new Date(intent.expectedEndDate);
  const mode = String(intent.mode || RENEWAL_MODES.RENEW).toUpperCase();
  const fallbackOrderId = createInternalOrderId({ orgId: organizationId, mode });

  const result = await prisma.$transaction(async (tx) => {
    let sub;
    if (mode === RENEWAL_MODES.EXTEND) {
      sub = await tx.subscription.update({ where: { id: intent.currentSubscriptionId }, data: { endDate: expEnd, paymentGateway: PAYMENT_GATEWAYS.PLAN_CREDIT, paymentOrderId: fallbackOrderId, activeKey: `ORG_${organizationId}` } });
      await tx.organization.update({ where: { id: organizationId }, data: { subscriptionStatus: "ACTIVE", subscriptionExpiry: expEnd, subscriptionId: sub.id } });
    } else {
      await tx.subscription.updateMany({ where: { orgId: organizationId, status: "ACTIVE", startDate: { lte: now } }, data: { status: "EXPIRED", activeKey: null } });
      sub = await tx.subscription.create({ data: { orgId: organizationId, planId: intent.planId || null, planName: intent.planName, planCode: intent.planCode, amount: roundMoney(Number(intent.payableAmount) + Number(intent.creditAmount)), currency: intent.currency || "INR", status: "ACTIVE", startDate: expStart, endDate: expEnd, paymentGateway: PAYMENT_GATEWAYS.PLAN_CREDIT, paymentOrderId: fallbackOrderId, createdById: userId, activeKey: `ORG_${organizationId}` } });
      await tx.organization.update({ where: { id: organizationId }, data: { planId: intent.planId || null, subscriptionStatus: "ACTIVE", subscriptionExpiry: expEnd, subscriptionId: sub.id } });
    }
    await tx.payment.create({ data: { orgId: organizationId, userId, subscriptionId: sub.id, planName: intent.planName, planCode: intent.planCode, amount: 0, currency: intent.currency || "INR", gateway: PAYMENT_GATEWAYS.PLAN_CREDIT, paymentOrderId: fallbackOrderId, status: "SUCCESS" } });
    await tx.subscriptionRenewalIntent.update({ where: { id: intent.id }, data: { status: "APPLIED", verifiedAt: now, appliedAt: now, appliedSubscriptionId: sub.id, gateway: PAYMENT_GATEWAYS.PLAN_CREDIT } });
    return { sub, org: await tx.organization.findUnique({ where: { id: organizationId } }) };
  });

  res.status(200).json({ success: true, message: "Subscription renewed.", idempotent: false, redirectPath: "/org/dashboard", subscription: { id: result.sub.id, planName: result.sub.planName, planCode: result.sub.planCode, startDate: result.sub.startDate, endDate: result.sub.endDate, amount: result.sub.amount, currency: result.sub.currency, status: result.sub.status }, organization: result.org ? { id: result.org.id, name: result.org.name, organizationCode: result.org.organizationCode, subscriptionStatus: result.org.subscriptionStatus, subscriptionExpiry: result.org.subscriptionExpiry } : null });
});

// -- POST /api/payment/verify-and-register (FREE TRIAL ONLY) ------------------
exports.verifyAndRegister = asyncHandler(async (req, res) => {
  const { organization, admin, plan } = req.body;
  const adminEmail = normalizeEmail(admin?.email);
  const organizationEmail = normalizeEmail(organization?.email);
  let organizationPhone, adminPhone;
  try {
    organizationPhone = normalizePhoneNumber({ phone: organization?.phone, countryCode: organization?.phoneCountryCode || organization?.countryCode, requireCountryCode: true });
    adminPhone = normalizePhoneNumber({ phone: admin?.mobile, countryCode: admin?.mobileCountryCode || admin?.countryCode, requireCountryCode: true });
  } catch (err) { res.status(400); throw new Error(err.message || "Invalid phone number"); }
  if (!organization || !admin || !plan) { res.status(400); throw new Error("Missing required registration data"); }
  if (!adminEmail || !organizationEmail) { res.status(400); throw new Error("Email fields are required"); }
  if (!admin.password) { res.status(400); throw new Error("Admin password is required"); }
  const normalizedPlanCode = String(plan.code).toUpperCase().trim();
  const dbPlan = await prisma.plan.findUnique({ where: { code: normalizedPlanCode } });
  const fallback = FALLBACK_PLANS[normalizedPlanCode] || null;
  const resolvedPlan = dbPlan ? { code: dbPlan.code, name: dbPlan.name, price: dbPlan.price, durationInDays: dbPlan.durationInDays, currency: dbPlan.currency || "INR" } : fallback;
  if (!resolvedPlan) { res.status(404); throw new Error("Invalid or inactive plan"); }
  if (!isFreeTrialPlan(resolvedPlan)) { res.status(400); throw new Error("Paid plans must go through the payment gateway."); }

  try { await ensureFreeTrialAvailable({ orgEmail: organizationEmail, adminEmail, adminPhone: adminPhone.e164 }); }
  catch (err) { res.status(err.statusCode || 500); throw new Error(err.message); }
  const [uE, oE] = await Promise.all([prisma.user.findUnique({ where: { email: adminEmail } }), prisma.organization.findUnique({ where: { email: organizationEmail } })]);
  if (uE) { res.status(409); throw new Error("An account with this email already exists."); }
  if (oE) { res.status(409); throw new Error("An organization with this email already exists."); }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const duration = resolvedPlan.durationInDays || 7;
      const expiryDate = new Date(Date.now() + duration * DAY_IN_MS);
      const refId = `FREE_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const { longitude, latitude } = parseCoordinates(organization);
      const orgCode = await generateUniqueOrgCode(tx);
      const refCode = await generateUniqueReferralCode(tx);
      const newOrg = await tx.organization.create({ data: { organizationCode: orgCode, referralCode: refCode, name: truncateText(organization.name, 120) || "Organization", email: organizationEmail, phone: organizationPhone.e164, phoneCountryCode: organizationPhone.countryCode, address: truncateText(organization.address, 191) || null, city: truncateText(organization.city, 120) || null, state: truncateText(organization.state, 120) || null, country: organization.country || "India", longitude, latitude, subscriptionStatus: "TRIAL", subscriptionExpiry: expiryDate, planId: dbPlan ? dbPlan.id : null, isActive: true } });
      const hashedPw = await bcrypt.hash(admin.password, 10);
      const adminRole = normalizeRole("ORG_ADMIN");
      const newUser = await tx.user.create({ data: { name: truncateText(admin.name, 120) || "Admin", email: adminEmail, mobile: adminPhone.e164, mobileCountryCode: adminPhone.countryCode, password: hashedPw, role: adminRole, orgId: newOrg.id, status: "APPROVED", isActive: true } });
      await createOrganizationMembership(tx, { userId: newUser.id, orgId: newOrg.id, role: adminRole, isActive: true });
      const sub = await tx.subscription.create({ data: { orgId: newOrg.id, planId: dbPlan ? dbPlan.id : null, planName: resolvedPlan.name, planCode: normalizedPlanCode, amount: Number(resolvedPlan.price), status: "ACTIVE", startDate: new Date(), endDate: expiryDate, paymentGateway: PAYMENT_GATEWAYS.FREE_TRIAL, paymentOrderId: refId, createdById: newUser.id, activeKey: `ORG_${newOrg.id}` } });
      await tx.payment.create({ data: { orgId: newOrg.id, userId: newUser.id, subscriptionId: sub.id, planName: resolvedPlan.name, planCode: normalizedPlanCode, amount: 0, gateway: PAYMENT_GATEWAYS.FREE_TRIAL, paymentOrderId: refId, status: "SUCCESS" } });
      await tx.organization.update({ where: { id: newOrg.id }, data: { subscriptionId: sub.id, orgAdminId: newUser.id } });
      await tx.$executeRaw`INSERT INTO free_trial_claim (orgEmail,adminEmail,adminPhone,planCode,startDate,endDate,orgName,adminName) VALUES (${organizationEmail},${adminEmail},${adminPhone.e164},${normalizedPlanCode},${new Date()},${expiryDate},${truncateText(organization.name,120)||null},${truncateText(admin.name,120)||null})`;
      return { newOrg, newUser };
    });
    let emailSent = false;
    try {
      await sendEmail({
        email: result.newUser.email,
        subject: `Welcome to Veagle Attendee - ${result.newOrg.organizationCode}`,
        greeting: `Hello ${result.newUser.name},`,
        intro: [
          "Congratulations! Your organization has been successfully registered on Veagle Attendee.",
          "Your Free Trial workspace is now active and ready for use. Below are your account details.",
        ],
        sections: [
          {
            eyebrow: "Account Details",
            title: "Organization Workspace",
            rows: [
              { label: "Org Name", value: result.newOrg.name },
              { label: "Org Code", value: result.newOrg.organizationCode },
              { label: "Referral Code", value: result.newOrg.referralCode },
              { label: "Join Link", valueHtml: `<a href="${getClientBaseUrl()}/register/user?ref=${result.newOrg.referralCode}" style="color:#7dd3fc;text-decoration:underline;word-break:break-all;">${getClientBaseUrl()}/register/user?ref=${result.newOrg.referralCode}</a>` },
              { label: "Admin Email", value: result.newUser.email },
            ],
          },
          {
            eyebrow: "Subscription Info",
            title: "Free Trial",
            rows: [
              { label: "Status", value: "ACTIVE (TRIAL)" },
              { label: "Start Date", value: new Date().toLocaleDateString("en-GB") },
              { label: "Expiry Date", value: new Date(result.newOrg.subscriptionExpiry).toLocaleDateString("en-GB") },
            ],
          },
        ],
        action: {
          label: "Go to Login",
          href: `${getClientBaseUrl()}/login`,
        },
        footnotes: [
          "Please keep your Organization Code safe. You and your team members will need it to login to the system.",
          "For security reasons, your password is not included in this email.",
        ],
        footerNote: "Empowering your workspace with smart attendance solutions.",
      });
      emailSent = true;
    } catch (e) {
      console.error("Free trial welcome email error:", e);
    }
    res.status(201).json({ success: true, message: "Registration completed successfully.", emailSent, user: { id: result.newUser.id, name: result.newUser.name, email: result.newUser.email } });
  } catch (dbErr) {
    console.error("DB Error during registration:", dbErr);
    if (dbErr?.statusCode) { res.status(dbErr.statusCode); throw new Error(dbErr.message || "Registration failed."); }
    const mapped = classifyDbError(dbErr);
    if (mapped) { res.status(mapped.status); throw new Error(mapped.message); }
    res.status(500); throw new Error(process.env.NODE_ENV === "production" ? "Failed to finalize registration." : `Failed: ${dbErr?.message}`);
  }
});

// -- POST /api/payment/archive-failed-registration ----------------------------
exports.archiveFailedRegistrationAttempt = asyncHandler(async (req, res) => {
  const { organization, admin, reason, metadata } = req.body;
  if (!organization || !admin) { res.status(400); throw new Error("Organization and admin details are required"); }
  const results = await archiveFailedRegistration({ organization, admin, reason: reason || "User abandoned or registration failed", metadata: metadata || {} });
  if (!results) { res.status(500); throw new Error("Failed to archive registration attempt"); }
  res.status(200).json({ success: true, message: "Registration attempt archived successfully", archivedId: results.archivedOrg.id });
});
