const loadCerebrasClient = () => {
  const sdk = require("@cerebras/cerebras_cloud_sdk");
  return sdk?.default || sdk?.Cerebras || sdk;
};

const UNRELATED_TOPIC = "unrelated";
const PLATFORM_TOPIC = "platform";
const SYSTEM_TOPIC = "system";

const DEFAULT_UNRELATED_ANSWER =
  "I am not familiar with that. I can help only with Veagle Attendee related questions.";
const DEFAULT_PLATFORM_FALLBACK =
  "I could not find a clear answer for that yet, but it does sound related to Veagle Attendee.";
const DEFAULT_SYSTEM_FALLBACK =
  "I am having trouble answering right now. Please try again in a moment.";

const PLATFORM_KEYWORDS = Object.freeze([
  "attendance",
  "attendee",
  "atty",
  "punch",
  "check in",
  "check-in",
  "check out",
  "check-out",
  "gps",
  "location",
  "geo",
  "radius",
  "team",
  "member",
  "admin",
  "organization",
  "organisation",
  "org",
  "user",
  "dashboard",
  "report",
  "export",
  "excel",
  "pdf",
  "subscription",
  "plan",
  "pricing",
  "billing",
  "payment",
  "trial",
  "renew",
  "expire",
  "login",
  "log in",
  "sign in",
  "register",
  "signup",
  "sign up",
  "forgot password",
  "reset password",
  "password",
  "notification",
  "qr",
  "biometric",
  "shift",
  "leave",
  "payroll",
  "salary",
  "overtime",
  "mobile app",
  "document",
  "upload",
  "work from home",
  "remote attendance",
  "attendance correction",
  "past attendance",
  "archive",
  "delete organization",
]);

const UNRELATED_KEYWORDS = Object.freeze([
  "cricket",
  "football",
  "ipl",
  "recipe",
  "weather",
  "movie",
  "song",
  "stock",
  "bitcoin",
  "news",
  "politics",
  "joke",
  "poem",
  "horoscope",
  "match score",
]);

const getClient = () => {
  const Cerebras = loadCerebrasClient();

  if (!process.env.CEREBRAS_API_KEY) {
    throw new Error("CEREBRAS_API_KEY is not set in .env");
  }

  return new Cerebras({ apiKey: process.env.CEREBRAS_API_KEY });
};

const ROLE_INSTRUCTIONS = {
  GUEST:
    "This visitor is not logged in. Answer platform questions in a general way and ask them to sign in only when workspace-specific data is required.",
  SUPER_ADMIN: `This user is a Super Admin with full platform access. They manage all organizations, subscription plans, and system configuration.`,
  ORG_ADMIN: `This user is an Organization Admin. They have full control over their organization: manage subscription via Razorpay, create Sub Admins, manage teams and Team Leaders, view analytics, manage employee records.`,
  ADMIN: `This user is an Admin. They can manage users, assign roles, manage team locations, and view reports. They CANNOT manage subscriptions or billing.`,
  TEAM_LEADER: `This user is a Team Leader. They can view and manage attendance for their assigned team(s), monitor team members, and view team reports. They CANNOT access billing, manage other teams, or create users.`,
  MEMBER: `This user is a Member (employee). They can punch in/out using GPS location, view their own attendance records, and view their team info. They CANNOT manage other users or access any admin features.`,
};

const buildSystemPrompt = (ctx) => {
  const expiryNote = ctx.subscriptionExpiry
    ? ` (expires ${new Date(ctx.subscriptionExpiry).toLocaleDateString("en-IN")})`
    : "";

  const subscriptionNote =
    {
      TRIAL: `User is on a free trial${expiryNote}.`,
      ACTIVE: `User has an active subscription${expiryNote}.`,
      EXPIRED:
        "User subscription has expired. Guide them to renew from the Subscription section if relevant.",
      NONE: "User has no active subscription.",
      UNKNOWN: "Subscription status is unknown.",
    }[ctx.subscriptionStatus] || "Subscription status is unknown.";

  return `You are Atty, the friendly support assistant for Veagle Attendee, an employee attendance management system.

PLATFORM FACTS:
- Users can punch in and punch out using current GPS location.
- Geo-fencing is required for attendance marking.
- Roles are SUPER_ADMIN, ORG_ADMIN, ADMIN, TEAM_LEADER, MEMBER.
- Teams, attendance, reports, subscriptions, pricing, registration, and forgot password are valid platform topics.
- Attendance reports can be exported.
- A 7 day free trial exists with full access.
- Org Admin manages subscription and billing.
- Organization registration is available from the public sign up flow.
- Forgot password works through the login page via email link.

FEATURES THAT DO NOT EXIST:
- QR check-in
- biometric integration
- shift scheduling
- leave management
- payroll
- overtime calculation
- mobile app
- user chat or messaging
- document uploads
- custom fields
- work from home attendance mode
- editing past attendance

DASHBOARD SECTIONS:
- ORG_ADMIN: Dashboard, Teams, Users, Attendance, Reports, Subscription, Notifications
- TEAM_LEADER: Dashboard, Teams, Attendance, Reports
- MEMBER: Dashboard, Attendance
- SUPER_ADMIN: Dashboard, Organizations, Plans, Payments, Analytics

CURRENT USER:
- Name: ${ctx.userName}
- Role: ${ctx.userRole}
- Organization: ${ctx.orgName || "N/A"} ${ctx.orgCode ? `(${ctx.orgCode})` : ""}
- Subscription: ${ctx.subscriptionStatus} | Plan: ${ctx.planName || "None"}
- Teams: ${ctx.teams.length > 0 ? ctx.teams.join(", ") : "None"}
- Permissions: ${ctx.permissions.length > 0 ? ctx.permissions.join(", ") : "None"}

ROLE CONTEXT:
${ROLE_INSTRUCTIONS[ctx.userRole] || ROLE_INSTRUCTIONS.MEMBER}

SUBSCRIPTION CONTEXT:
${subscriptionNote}

RESPONSE RULES:
1. Answer only about Veagle Attendee.
2. Keep answers short, warm, and in plain language.
3. Use 1 to 2 sentences only.
4. Do not invent features or dashboard sections.
5. If a feature does not exist, say so clearly and warmly, and still treat it as a platform question.
6. If the user is not logged in, still answer Veagle Attendee questions in a general way.
7. If the question is unrelated to Veagle Attendee, answer with this meaning only: "I am not familiar with that. I can help only with Veagle Attendee related questions."
8. Set topic to "platform" for any Veagle Attendee question, even when the feature does not exist.
9. Set topic to "unrelated" only when the question is clearly outside Veagle Attendee.
10. Set confidence to "low" only for unrelated questions. Otherwise use "high".
11. Never mention support forms, escalation, or contacting support in the answer.

Return only a JSON object in this exact shape:
{"answer":"your answer","confidence":"high","topic":"platform","suggestedActions":[]}`;
};

const normalizeTopic = (parsed = {}) => {
  if (parsed.topic === UNRELATED_TOPIC) {
    return UNRELATED_TOPIC;
  }

  if (parsed.topic === PLATFORM_TOPIC) {
    return PLATFORM_TOPIC;
  }

  if (parsed.confidence === "low") {
    return UNRELATED_TOPIC;
  }

  return PLATFORM_TOPIC;
};

const normalizeAnswer = (answer, topic) => {
  const trimmed = String(answer || "").trim();

  if (topic === UNRELATED_TOPIC) {
    return DEFAULT_UNRELATED_ANSWER;
  }

  return trimmed || DEFAULT_PLATFORM_FALLBACK;
};

const normalizeMessage = (message) =>
  String(message || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const includesAny = (text, keywords) => keywords.some((keyword) => text.includes(keyword));

const isPlatformQuestion = (message) => includesAny(message, PLATFORM_KEYWORDS);

const isClearlyUnrelatedQuestion = (message) =>
  includesAny(message, UNRELATED_KEYWORDS) || (!isPlatformQuestion(message) && /\b(recipe|score|weather|movie|song|cricket|football|ipl|stock|bitcoin|politic|joke)\b/.test(message));

const buildSubscriptionAnswer = (ctx) => {
  if (ctx.subscriptionStatus === "ACTIVE") {
    return ctx.planName
      ? `Your workspace is on an active ${ctx.planName} subscription. The Org Admin can review it anytime from the Subscription section.`
      : "Your workspace has an active subscription. The Org Admin can review full plan details from the Subscription section.";
  }

  if (ctx.subscriptionStatus === "TRIAL") {
    return "Your workspace is on the 7 day free trial right now. The Org Admin can check plan and expiry details from the Subscription section.";
  }

  if (ctx.subscriptionStatus === "EXPIRED") {
    return "Your workspace subscription has expired. The Org Admin can renew it from the Subscription section.";
  }

  return "Subscription is managed from the Subscription section by the Org Admin. New organizations start with a 7 day free trial.";
};

const buildRuleBasedFallback = (message, ctx) => {
  const normalizedMessage = normalizeMessage(message);

  if (isClearlyUnrelatedQuestion(normalizedMessage)) {
    return {
      answer: DEFAULT_UNRELATED_ANSWER,
      confidence: "low",
      topic: UNRELATED_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "punch in",
      "punch out",
      "check in",
      "check out",
      "mark attendance",
      "attendance mark",
    ])
  ) {
    return {
      answer:
        "Open the Attendance section, turn on your GPS, and make sure you are inside your organization location radius before you punch in or out.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "location rejected",
      "gps",
      "geo",
      "radius",
      "outside location",
      "location issue",
    ])
  ) {
    return {
      answer:
        "This usually means your GPS is off or you are outside the allowed attendance radius. Turn on accurate location and try again from inside the work area.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "attendance",
      "attendance record",
      "my attendance",
      "history",
      "present",
      "absent",
      "late",
    ])
  ) {
    return {
      answer:
        "You can check your attendance from the Attendance section. For filtered summaries and downloads, use the Reports section if your role has access to it.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "report",
      "export",
      "excel",
      "pdf",
    ])
  ) {
    return {
      answer:
        "Reports can be filtered by period and exported in Excel or PDF. Use the Reports section in your dashboard to generate them.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "subscription",
      "plan",
      "pricing",
      "billing",
      "payment",
      "trial",
      "renew",
      "expired",
    ])
  ) {
    return {
      answer: buildSubscriptionAnswer(ctx),
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "team",
      "team leader",
      "member",
      "user",
      "role",
      "manage team",
    ])
  ) {
    return {
      answer:
        "Teams and users are managed from the dashboard based on your role. Org Admin can manage teams and users fully, while Team Leaders mainly handle their assigned team attendance and reports.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "forgot password",
      "reset password",
      "password reset",
      "login",
      "sign in",
    ])
  ) {
    return {
      answer:
        "Use the Forgot Password option on the login page to reset your password through email. In-app password change without email verification is not available here.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "register organization",
      "create organization",
      "register org",
      "sign up organization",
      "organization registration",
    ])
  ) {
    return {
      answer:
        "Anyone can register a new organization from the public sign up flow. A 7 day free trial starts automatically after registration.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (
    includesAny(normalizedMessage, [
      "qr",
      "biometric",
      "shift",
      "leave",
      "payroll",
      "salary",
      "overtime",
      "mobile app",
      "chat",
      "message",
      "document upload",
      "custom field",
      "work from home",
      "remote attendance",
      "edit past attendance",
      "attendance correction",
      "settings",
      "profile section",
    ])
  ) {
    return {
      answer:
        "That feature is not available in Veagle Attendee right now. Atty can still help with attendance, teams, reports, subscription, login, and registration questions.",
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  if (isPlatformQuestion(normalizedMessage)) {
    return {
      answer: DEFAULT_PLATFORM_FALLBACK,
      confidence: "high",
      topic: PLATFORM_TOPIC,
      suggestedActions: [],
    };
  }

  return {
    answer: DEFAULT_UNRELATED_ANSWER,
    confidence: "low",
    topic: UNRELATED_TOPIC,
    suggestedActions: [],
  };
};

const askOpenAI = async (message, context) => {
  try {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: "llama3.1-8b",
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        { role: "system", content: buildSystemPrompt(context) },
        { role: "user", content: message },
      ],
    });

    const raw = response.choices[0]?.message?.content || "{}";
    console.log("[Atty] Raw response:", raw);

    const cleaned = raw
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    const topic = normalizeTopic(parsed);

    console.log("[Atty] Confidence:", parsed.confidence);
    console.log("[Atty] Topic:", topic);

    return {
      answer: normalizeAnswer(parsed.answer, topic),
      confidence: topic === UNRELATED_TOPIC ? "low" : "high",
      topic,
      suggestedActions: [],
    };
  } catch (err) {
    console.error("[Atty] AI error:", err.message);
    const fallback = buildRuleBasedFallback(message, context);

    if (fallback.topic === PLATFORM_TOPIC || fallback.topic === UNRELATED_TOPIC) {
      return fallback;
    }

    return {
      answer: DEFAULT_SYSTEM_FALLBACK,
      confidence: "high",
      topic: SYSTEM_TOPIC,
      suggestedActions: [],
    };
  }
};

module.exports = { askOpenAI };
