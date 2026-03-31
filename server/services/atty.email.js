const sendEmail = require("../utils/email");
const { buildEmailTemplate, escapeHtml } = require("../utils/email-template");

const getSupportRecipient = () =>
  String(process.env.SUPPORT_EMAIL || process.env.SMTP_USER || process.env.EMAIL || "").trim();

const formatMessageHtml = (subject, message) => `
  <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#ffffff;font-weight:700">
    ${escapeHtml(subject || "Support Query")}
  </p>
  <p style="margin:0;font-size:14px;line-height:1.8;color:#d6e5ff">
    ${escapeHtml(message || "").replace(/\n/g, "<br/>")}
  </p>
`;

const sendSupportEmail = async ({
  ticketId,
  name,
  email,
  role,
  subject,
  message,
  orgId,
  orgName,
}) => {
  const supportRecipient = getSupportRecipient();

  if (!supportRecipient) {
    return {
      sent: false,
      reason: "Email delivery skipped because SMTP configuration is incomplete.",
    };
  }

  const firstName = String(name || "there").trim().split(/\s+/)[0] || "there";
  const supportSubject = `[Attendee Support] ${subject} - Ticket #${ticketId}`;
  const supportMessage = `New support query received.

Ticket ID: #${ticketId}
User Name: ${name}
User Email: ${email}
Role: ${role}
Org ID: ${orgId || "N/A"}
Org Name: ${orgName || "N/A"}

Subject:
${subject}

Message:
${message}`;
  const supportHtml = buildEmailTemplate({
    eyebrow: "Support Ticket",
    title: "New workspace support query",
    subtitle: `Ticket #${ticketId}`,
    greeting: `User: ${name}`,
    intro: ["A new support request was submitted from Veagle Attendee."],
    sections: [
      {
        eyebrow: "User Details",
        title: "Requester information",
        rows: [
          { label: "Ticket ID", value: `#${ticketId}` },
          { label: "User Name", value: name },
          {
            label: "User Email",
            valueHtml: `<a href="mailto:${escapeHtml(email)}" style="color:#7dd3fc;text-decoration:none">${escapeHtml(
              email
            )}</a>`,
          },
          { label: "Role", value: role },
          { label: "Org ID", value: orgId || "N/A" },
          { label: "Org Name", value: orgName || "N/A" },
        ],
      },
      {
        eyebrow: "Query",
        title: "Support request details",
        bodyHtml: formatMessageHtml(subject, message),
      },
    ],
    footnotes: [`Reply directly to ${email} to respond to this user.`],
    footerNote: "Support operations for Veagle Attendee workspaces.",
  });

  const confirmationSubject = `We received your query - Ticket #${ticketId}`;
  const confirmationMessage = `Hello ${firstName},

We received your support request on Veagle Attendee.

Ticket ID: #${ticketId}
Subject: ${subject}

Our support team will reply to you within 24 hours.`;
  const confirmationHtml = buildEmailTemplate({
    eyebrow: "Support Received",
    title: "We received your query",
    subtitle: `Ticket #${ticketId}`,
    greeting: `Hello ${firstName}`,
    intro: [
      "Your support request has been received successfully.",
      "Our team will review it and get back to you within 24 hours.",
    ],
    sections: [
      {
        eyebrow: "Ticket Summary",
        title: "Track this support request",
        rows: [
          { label: "Ticket ID", value: `#${ticketId}` },
          { label: "Subject", value: subject },
          { label: "Workspace", value: orgName || "Veagle Attendee" },
        ],
      },
    ],
    footerNote: "Support updates for your workspace will continue on this email thread.",
  });

  try {
    await sendEmail({
      email: supportRecipient,
      subject: supportSubject,
      message: supportMessage,
      html: supportHtml,
      replyTo: email,
      fromName: "Atty - Veagle Attendee",
    });

    await sendEmail({
      email,
      subject: confirmationSubject,
      message: confirmationMessage,
      html: confirmationHtml,
      fromName: "Atty - Veagle Attendee",
    });

    console.log(`[Atty] Support email sent - ticket #${ticketId}`);
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      reason: error.message || "Support email could not be sent.",
    };
  }
};

module.exports = { sendSupportEmail };
