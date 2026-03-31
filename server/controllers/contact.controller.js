const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { parseLimit, toSummaryItem, truncateText } = require("../services/common.service");
const { sendContactInquiryNotifications } = require("../services/contact-inquiry.email");
const { normalizeEmail } = require("../utils/contact");

const CONTACT_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,119}$/u;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_SUBJECT_MAX = 120;
const CONTACT_MESSAGE_MAX = 500;

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

exports.submitContactInquiry = asyncHandler(async (req, res) => {
  let payload;

  try {
    payload = parseContactInquiryPayload(req.body);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const inquiry = await prisma.contactInquiry.create({
    data: {
      name: payload.name,
      email: payload.email,
      subject: payload.subject,
      message: payload.message,
    },
  });

  const superAdminUsers = await prisma.user.findMany({
    where: {
      role: "SUPER_ADMIN",
      deletedAt: null,
      isActive: true,
    },
    select: {
      email: true,
    },
  });

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

  await prisma.contactInquiry.update({
    where: {
      id: inquiry.id,
    },
    data: {
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
    },
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
  const inquiries = await prisma.contactInquiry.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
  });

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
