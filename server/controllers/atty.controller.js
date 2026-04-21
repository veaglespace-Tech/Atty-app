const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { buildAttyContext } = require("../services/atty.context");
const { askOpenAI } = require("../services/atty.openai");
const { sendSupportEmail } = require("../services/atty.email");
const {
  ensureSupportTicketsTable,
} = require("../utils/ensure-support-tickets-table");

// POST /api/atty/chat
const attyChat = asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    res.status(400);
    throw new Error("Message is required.");
  }

  const context = await buildAttyContext(req.user);
  const result = await askOpenAI(message.trim(), context);

  res.json({
    answer: result.answer,
    confidence: result.confidence,
    showForm: Boolean(req.user?.id) && result.topic === "unrelated",
    topic: result.topic,
    suggestedActions: result.suggestedActions,
  });
});

// POST /api/atty/support
const attySupport = asyncHandler(async (req, res) => {
  const { name, email, role, subject, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    res.status(400);
    throw new Error("Name, email, and message are required.");
  }

  const resolvedName = name.trim();
  const resolvedEmail = email.trim();
  const resolvedRole = role || req.user?.role || "MEMBER";
  const resolvedSubject = subject?.trim() || "Support Query";
  const resolvedMessage = message.trim();

  // Fetch orgId and orgName from user context
  const resolvedOrgId = req.user?.organizationId
    ? Number(req.user.organizationId)
    : req.user?.orgId
      ? Number(req.user.orgId)
      : null;

  const resolvedUserId = req.user?.id ? Number(req.user.id) : null;

  // Fetch org name from DB using orgId
  let resolvedOrgName = req.user?.organization?.name || null;
  if (!resolvedOrgName && resolvedOrgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: resolvedOrgId },
        select: { name: true },
      });
      resolvedOrgName = org?.name || null;
    } catch (_) {}
  }

  await ensureSupportTicketsTable();

  await prisma.$executeRaw`
    INSERT INTO support_tickets (name, email, role, subject, message, status, orgId, userId, createdAt, updatedAt)
    VALUES (
      ${resolvedName},
      ${resolvedEmail},
      ${resolvedRole},
      ${resolvedSubject},
      ${resolvedMessage},
      ${"PENDING"},
      ${resolvedOrgId},
      ${resolvedUserId},
      NOW(3),
      NOW(3)
    )
  `;

  const latestTicketRows = await prisma.$queryRaw`
    SELECT id, name, email, role, subject, message, status, orgId, userId
    FROM support_tickets
    WHERE email = ${resolvedEmail}
    ORDER BY id DESC
    LIMIT 1
  `;

  const ticket = Array.isArray(latestTicketRows) ? latestTicketRows[0] : null;
  if (!ticket?.id) {
    res.status(500);
    throw new Error("Support ticket could not be created.");
  }

  let emailSent = false;
  let emailWarning = null;

  try {
    const emailResult = await sendSupportEmail({
      ticketId: ticket.id,
      name: ticket.name,
      email: ticket.email,
      role: ticket.role,
      subject: ticket.subject,
      message: ticket.message,
      orgId: resolvedOrgId,
      orgName: resolvedOrgName,
    });
    emailSent = Boolean(emailResult?.sent);
    emailWarning = emailResult?.reason || null;
  } catch (error) {
    emailWarning = error.message || "Support email could not be sent.";
    console.error("[Atty] Support email failed:", error.message || error);
  }

  res.json({
    success: true,
    ticketId: ticket.id,
    emailSent,
    message: emailSent
      ? "Query submitted. We will reply to your email within 24 hours."
      : "Query submitted successfully. Ticket saved, but confirmation email could not be sent right now.",
    warning: emailWarning,
  });
});

module.exports = { attyChat, attySupport };
