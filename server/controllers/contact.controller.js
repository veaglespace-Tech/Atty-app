const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { parseLimit, toSummaryItem, truncateText } = require("../services/common.service");
const { sendContactInquiryNotifications } = require("../services/contact-inquiry.email");
const { normalizeEmail } = require("../utils/contact");

const CONTACT_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,119}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_SUBJECT_MAX = 120;
const CONTACT_MESSAGE_MAX = 500;

let ensureContactInquiriesTablePromise = null;

const contactInquiriesTableSql = `
  CREATE TABLE IF NOT EXISTS \`contact_inquiries\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`name\` VARCHAR(191) NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`subject\` VARCHAR(191) NOT NULL,
    \`message\` TEXT NOT NULL,
    \`status\` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    \`adminNotificationSentAt\` DATETIME(3) NULL,
    \`adminNotificationError\` VARCHAR(191) NULL,
    \`requesterNotificationSentAt\` DATETIME(3) NULL,
    \`requesterNotificationError\` VARCHAR(191) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`contact_inquiries_status_idx\` (\`status\`),
    INDEX \`contact_inquiries_createdAt_idx\` (\`createdAt\`),
    INDEX \`contact_inquiries_email_createdAt_idx\` (\`email\`, \`createdAt\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const ensureContactInquiriesTable = async () => {
  if (!ensureContactInquiriesTablePromise) {
    ensureContactInquiriesTablePromise = prisma.$executeRawUnsafe(contactInquiriesTableSql);
  }

  try {
    await ensureContactInquiriesTablePromise;
  } catch (error) {
    ensureContactInquiriesTablePromise = null;
    throw error;
  }
};

const normalizeSingleLineText = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const normalizeMultilineText = (value) =>
  String(value ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/\s+/g, " "))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const resolveNotificationMailbox = () =>
  normalizeEmail(
    process.env.SUPPORT_EMAIL ||
      process.env.EMAIL_USER ||
      process.env.EMAIL ||
      process.env.SMTP_USER
  );

const ensureLength = ({ value, label, min, max }) => {
  if (!value) {
    throw new Error(`${label} is required`);
  }
  if (value.length < min) {
    throw new Error(`${label} must be at least ${min} characters`);
  }
  if (value.length > max) {
    throw new Error(`${label} must be at most ${max} characters`);
  }
};

const parseContactInquiryPayload = (body = {}) => {
  const name = normalizeSingleLineText(body.name);
  const email = normalizeEmail(body.email);
  const subject = normalizeSingleLineText(body.subject);
  const message = normalizeMultilineText(body.message);

  ensureLength({
    value: name,
    label: "Full name",
    min: 2,
    max: 120,
  });
  if (!CONTACT_NAME_REGEX.test(name)) {
    throw new Error(
      "Full name can only include letters, spaces, apostrophes, dots, or hyphens"
    );
  }

  if (!email) {
    throw new Error("Email address is required");
  }
  if (email.length > 191 || !EMAIL_REGEX.test(email)) {
    throw new Error("Enter a valid email address");
  }

  ensureLength({
    value: subject,
    label: "Subject",
    min: 3,
    max: CONTACT_SUBJECT_MAX,
  });

  ensureLength({
    value: message,
    label: "Message",
    min: 10,
    max: CONTACT_MESSAGE_MAX,
  });

  return {
    name,
    email,
    subject,
    message,
  };
};

const getNotificationStatus = (sentAt, errorMessage) => {
  if (sentAt) return "SUCCESS";
  if (errorMessage) return "FAILED";
  return "PENDING";
};

const toContactInquiryItem = (inquiry) => ({
  id: inquiry.id,
  name: inquiry.name,
  email: inquiry.email,
  subject: inquiry.subject,
  message: inquiry.message,
  status: inquiry.status,
  adminMailStatus: getNotificationStatus(
    inquiry.adminNotificationSentAt,
    inquiry.adminNotificationError
  ),
  requesterMailStatus: getNotificationStatus(
    inquiry.requesterNotificationSentAt,
    inquiry.requesterNotificationError
  ),
  adminNotificationError: inquiry.adminNotificationError || "",
  requesterNotificationError: inquiry.requesterNotificationError || "",
  createdAt: inquiry.createdAt,
});

const getContactInquiryDelegate = () => {
  const delegate = prisma.contactInquiry;
  if (!delegate || typeof delegate !== "object") return null;
  return delegate;
};

const createContactInquiry = async (payload) => {
  const delegate = getContactInquiryDelegate();
  if (delegate && typeof delegate.create === "function") {
    return delegate.create({
      data: {
        name: payload.name,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
      },
    });
  }

  await ensureContactInquiriesTable();

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO contact_inquiries (
        name,
        email,
        subject,
        message,
        status,
        createdAt,
        updatedAt
      )
      VALUES (
        ${payload.name},
        ${payload.email},
        ${payload.subject},
        ${payload.message},
        ${"NEW"},
        NOW(3),
        NOW(3)
      )
    `;

    const rows = await tx.$queryRaw`
      SELECT
        id,
        name,
        email,
        subject,
        message,
        status,
        adminNotificationSentAt,
        adminNotificationError,
        requesterNotificationSentAt,
        requesterNotificationError,
        createdAt,
        updatedAt
      FROM contact_inquiries
      WHERE id = LAST_INSERT_ID()
      LIMIT 1
    `;

    return Array.isArray(rows) ? rows[0] || null : null;
  });
};

const updateContactInquiry = async (id, data) => {
  const delegate = getContactInquiryDelegate();
  if (delegate && typeof delegate.update === "function") {
    return delegate.update({
      where: { id: Number(id) },
      data,
    });
  }

  await ensureContactInquiriesTable();

  await prisma.$executeRaw`
    UPDATE contact_inquiries
    SET
      adminNotificationSentAt = ${data.adminNotificationSentAt ?? null},
      adminNotificationError = ${data.adminNotificationError ?? null},
      requesterNotificationSentAt = ${data.requesterNotificationSentAt ?? null},
      requesterNotificationError = ${data.requesterNotificationError ?? null},
      updatedAt = NOW(3)
    WHERE id = ${Number(id)}
  `;
};

const findContactInquiries = async (limit) => {
  const delegate = getContactInquiryDelegate();
  if (delegate && typeof delegate.findMany === "function") {
    return delegate.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: limit,
    });
  }

  await ensureContactInquiriesTable();

  return prisma.$queryRawUnsafe(`
    SELECT
      id,
      name,
      email,
      subject,
      message,
      status,
      adminNotificationSentAt,
      adminNotificationError,
      requesterNotificationSentAt,
      requesterNotificationError,
      createdAt,
      updatedAt
    FROM contact_inquiries
    ORDER BY createdAt DESC
    LIMIT ${Number(limit)}
  `);
};

const findSuperAdminEmailRows = async () => {
  const userDelegate = prisma.user;
  if (userDelegate && typeof userDelegate.findMany === "function") {
    return userDelegate.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        role: "SUPER_ADMIN",
      },
      select: {
        email: true,
      },
    });
  }

  return prisma.$queryRawUnsafe(`
    SELECT DISTINCT u.email
    FROM user u
    WHERE u.deletedAt IS NULL
      AND u.isActive = 1
      AND UPPER(REPLACE(COALESCE(u.role, ''), '-', '_')) IN ('SUPER_ADMIN', 'SUPERADMIN')
  `);
};

exports.submitContactInquiry = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = parseContactInquiryPayload(req.body);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const inquiry = await createContactInquiry(payload);

  const superAdminUsers = await findSuperAdminEmailRows();

  const notificationRecipients = [
    ...new Set(
      [...superAdminUsers.map((user) => normalizeEmail(user.email)), resolveNotificationMailbox()]
        .filter(Boolean)
    ),
  ];

  const notificationResult = await sendContactInquiryNotifications({
    inquiryId: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    subject: inquiry.subject,
    message: inquiry.message,
    superAdminEmails: notificationRecipients,
  });

  await updateContactInquiry(inquiry.id, {
    adminNotificationSentAt: notificationResult.adminNotification.sent ? new Date() : null,
    adminNotificationError: notificationResult.adminNotification.error
      ? truncateText(notificationResult.adminNotification.error)
      : null,
    requesterNotificationSentAt: notificationResult.requesterNotification.sent
      ? new Date()
      : null,
    requesterNotificationError: notificationResult.requesterNotification.error
      ? truncateText(notificationResult.requesterNotification.error)
      : null,
  });

  const warnings = [
    notificationResult.adminNotification.sent
      ? null
      : notificationResult.adminNotification.error,
    notificationResult.requesterNotification.sent
      ? null
      : notificationResult.requesterNotification.error,
  ].filter(Boolean);

  res.status(201).json({
    success: true,
    inquiryId: inquiry.id,
    adminNotified: notificationResult.adminNotification.sent,
    requesterNotified: notificationResult.requesterNotification.sent,
    message:
      warnings.length === 0
        ? "Message sent successfully! Our team will reach out soon."
        : "Message saved successfully. Our team will review it shortly.",
    warning: warnings.join(" "),
  });
});

exports.getSuperAdminContactInquiries = asyncHandler(async (req, res) => {
  const limit = parseLimit(req.query.limit, 250, 1000);
  const inquiries = await findContactInquiries(limit);

  const items = inquiries.map(toContactInquiryItem);

  res.status(200).json({
    success: true,
    summary: [
      toSummaryItem("Inquiries", items.length),
      toSummaryItem("New", items.filter((item) => item.status === "NEW").length),
      toSummaryItem(
        "Admin Mail Sent",
        items.filter((item) => item.adminMailStatus === "SUCCESS").length
      ),
      toSummaryItem(
        "Sender Mail Sent",
        items.filter((item) => item.requesterMailStatus === "SUCCESS").length
      ),
    ],
    items,
    meta: {
      limit,
      total: items.length,
    },
  });
});
