const sendEmail = require("../utils/email");

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildSupportEmailHtml = ({ inquiryId, name, email, subject, message }) => {
  const escapedMessage = escapeHtml(message).replace(/\n/g, "<br />");

  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:24px;color:#0f172a">
      <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);border-radius:20px;padding:24px;color:#ffffff">
        <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.78">Public Contact Inquiry</p>
        <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2">New message received</h1>
      </div>
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:24px;margin-top:18px">
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#64748b;width:140px">Inquiry ID</td>
            <td style="padding:10px 0;font-size:14px;font-weight:700;color:#1d4ed8">#${inquiryId}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#64748b">Name</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#64748b">Email</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600">
              <a href="mailto:${escapeHtml(email)}" style="color:#1d4ed8;text-decoration:none">${escapeHtml(email)}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:13px;color:#64748b">Subject</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600">${escapeHtml(subject)}</td>
          </tr>
        </table>
      </div>
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:24px;margin-top:18px">
        <p style="margin:0 0 12px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b">Message</p>
        <p style="margin:0;font-size:15px;line-height:1.8;color:#0f172a">${escapedMessage}</p>
      </div>
    </div>
  `;
};

const buildRequesterEmailHtml = ({ inquiryId, name, subject }) => `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="background:linear-gradient(135deg,#1d4ed8,#0f172a);border-radius:20px;padding:24px;color:#ffffff">
      <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.78">Veagle Attendee</p>
      <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2">We received your message</h1>
    </div>
    <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:20px;padding:24px;margin-top:18px">
      <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#0f172a">
        Hi ${escapeHtml(name.split(" ")[0] || name)}, thanks for contacting us. Our team has received your inquiry and will follow up soon.
      </p>
      <div style="border:1px solid #dbeafe;border-radius:16px;padding:16px;background:#eff6ff">
        <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#64748b">Reference</p>
        <p style="margin:0;font-size:14px;font-weight:700;color:#1d4ed8">Inquiry #${inquiryId}</p>
        <p style="margin:10px 0 0;font-size:14px;color:#0f172a"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      </div>
      <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#475569">
        If you need to add anything else, you can reply to this email and our team will take it forward.
      </p>
    </div>
  </div>
`;

const attemptEmailDelivery = async (callback, fallbackErrorMessage) => {
  try {
    await callback();
    return {
      sent: true,
      error: null,
    };
  } catch (error) {
    return {
      sent: false,
      error: error?.message || fallbackErrorMessage,
    };
  }
};

const sendContactInquiryNotifications = async ({
  inquiryId,
  name,
  email,
  subject,
  message,
  superAdminEmails = [],
}) => {
  const uniqueSuperAdminEmails = [...new Set(superAdminEmails.filter(Boolean))];

  const adminNotification =
    uniqueSuperAdminEmails.length > 0
      ? await attemptEmailDelivery(
          () =>
            sendEmail({
              email: uniqueSuperAdminEmails.join(","),
              subject: `[Contact Inquiry #${inquiryId}] ${subject}`,
              message: `New contact inquiry #${inquiryId}\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
              html: buildSupportEmailHtml({
                inquiryId,
                name,
                email,
                subject,
                message,
              }),
            }),
          "Super admin notification email could not be sent."
        )
      : {
          sent: false,
          error: "No super admin email recipients are configured.",
        };

  const requesterNotification = await attemptEmailDelivery(
    () =>
      sendEmail({
        email,
        subject: `We received your message - Inquiry #${inquiryId}`,
        message: `Hi ${name},\n\nWe received your message regarding "${subject}". Our team will review it and get back to you soon.\n\nReference: Inquiry #${inquiryId}\n\nVeagle Attendee`,
        html: buildRequesterEmailHtml({
          inquiryId,
          name,
          subject,
        }),
      }),
    "Confirmation email could not be sent to the contact person."
  );

  return {
    adminNotification,
    requesterNotification,
  };
};

module.exports = {
  sendContactInquiryNotifications,
};
