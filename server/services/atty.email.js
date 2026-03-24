const nodemailer = require("nodemailer");
const path = require("path");

const getMailConfig = () => {
  const user = process.env.SMTP_USER || process.env.EMAIL || "";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";
  const supportEmail = process.env.SUPPORT_EMAIL || user;
  const isGmail = user.toLowerCase().endsWith("@gmail.com");

  return {
    host: process.env.SMTP_HOST || (isGmail ? "smtp.gmail.com" : ""),
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass,
    supportEmail,
  };
};

const createTransport = () => {
  const config = getMailConfig();
  if (!config.host || !config.user || !config.pass || !config.supportEmail) {
    return null;
  }
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });
};

const logoPath = path.join(__dirname, "../../client/public/Logo.webp");

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
  const config = getMailConfig();
  const transport = createTransport();

  if (!transport) {
    return {
      sent: false,
      reason:
        "Email delivery skipped because SMTP configuration is incomplete.",
    };
  }

  const firstName = name ? name.split(" ")[0] : "there";

  const poweredBy = `
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;min-width:280px">
      <tr>
        <td align="center" style="background:#EBF4FF;border:1px solid #d0dcf5;border-radius:12px;padding:10px 24px;white-space:nowrap">
          <p style="margin:0 0 2px;font-size:11px;color:#185FA5;white-space:nowrap">Powered by</p>
          <p style="margin:0;font-size:12px;color:#185FA5;font-weight:700;white-space:nowrap">Veagle Space Technologies Pvt Ltd</p>
        </td>
      </tr>
    </table>`;

  // ── Email 1: Support inbox ──────────────────────────────────
  await transport.sendMail({
    from: `"Atty - Attendee" <${config.user}>`,
    to: config.supportEmail,
    replyTo: email,
    subject: `[Attendee Support] ${subject} - Ticket #${ticketId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;color:#1a1a1a;margin:0 auto">
        <div style="background:#185FA5;padding:20px 28px;border-radius:10px 10px 0 0">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="52" valign="middle">
                <img src="cid:vslogo" width="42" height="42"
                  style="display:block;border-radius:8px;width:42px;height:42px;object-fit:cover"
                  alt="Attendee"/>
              </td>
              <td valign="middle" style="padding-left:14px">
                <h2 style="color:white;margin:0;font-size:17px;font-weight:600">New Support Query</h2>
              </td>
            </tr>
          </table>
        </div>
        <div style="background:#f8f8f7;padding:24px 28px;border:1px solid #e5e3df;border-top:none;border-radius:0 0 10px 10px">
          <div style="background:white;border-radius:8px;border:1px solid #e5e3df;overflow:hidden;margin-bottom:18px">
            <div style="background:#EBF4FF;padding:10px 16px;border-bottom:1px solid #e5e3df">
              <p style="margin:0;font-size:12px;font-weight:600;color:#185FA5;text-transform:uppercase;letter-spacing:0.5px">Ticket Details</p>
            </div>
            <table style="width:100%;font-size:14px;border-collapse:collapse">
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:10px 16px;color:#6b6a65;width:140px;font-weight:500">Ticket ID</td>
                <td style="padding:10px 16px;font-weight:700;color:#185FA5">#${ticketId}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;background:#fafafa">
                <td style="padding:10px 16px;color:#6b6a65;font-weight:500">User Name</td>
                <td style="padding:10px 16px">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:10px 16px;color:#6b6a65;font-weight:500">User Email</td>
                <td style="padding:10px 16px"><a href="mailto:${email}" style="color:#185FA5;text-decoration:none">${email}</a></td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0;background:#fafafa">
                <td style="padding:10px 16px;color:#6b6a65;font-weight:500">Org ID</td>
                <td style="padding:10px 16px;font-family:monospace;color:#555">${orgId || "N/A"}</td>
              </tr>
              <tr style="border-bottom:1px solid #f0f0f0">
                <td style="padding:10px 16px;color:#6b6a65;font-weight:500">Org Name</td>
                <td style="padding:10px 16px">${orgName || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;color:#6b6a65;font-weight:500">Role</td>
                <td style="padding:10px 16px">${role}</td>
              </tr>
            </table>
          </div>
          <div style="background:white;border-radius:8px;border:1px solid #e5e3df;overflow:hidden;margin-bottom:18px">
            <div style="background:#EBF4FF;padding:10px 16px;border-bottom:1px solid #e5e3df">
              <p style="margin:0;font-size:12px;font-weight:600;color:#185FA5;text-transform:uppercase;letter-spacing:0.5px">Query</p>
            </div>
            <div style="padding:16px">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#1a1a1a">${subject}</p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#444">${message.replace(/\n/g, "<br>")}</p>
            </div>
          </div>
          <div style="background:#FFF8E7;border:1px solid #FFE4A0;border-radius:8px;padding:12px 16px;margin-bottom:18px">
            <p style="margin:0;font-size:13px;color:#856404">
              Reply to this email to respond directly to
              <a href="mailto:${email}" style="color:#185FA5;font-weight:500">${email}</a>
            </p>
          </div>
          <div style="border-top:1px solid #e5e3df;padding-top:16px;text-align:center">
            ${poweredBy}
          </div>
        </div>
      </div>
    `,
    attachments: [{ filename: "Logo.webp", path: logoPath, cid: "vslogo" }],
  });

  // ── Email 2: User confirmation ──────────────────────────────
  await transport.sendMail({
    from: `"Atty - Attendee" <${config.user}>`,
    to: email,
    subject: `We received your query - Ticket #${ticketId}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
        <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
        <title>Query Received</title>
      </head>
      <body style="margin:0;padding:0;background:#f0f4f8">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:24px 0">
          <tr>
            <td align="center">
              <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%">

                <!-- Header -->
                <tr>
                  <td align="center" style="background:#185FA5;border-radius:10px 10px 0 0;padding:28px 24px 24px">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="padding-bottom:14px">
                          <img src="cid:vslogo" width="52" height="52"
                            style="display:block;border-radius:10px;width:52px;height:52px;object-fit:cover"
                            alt="Attendee"/>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;line-height:1.3">
                            We got your message, ${firstName} !
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:6px">
                          <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.78)">
                            Your query is in safe hands.
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="background:#ffffff;border:1px solid #e5e3df;border-top:none;border-radius:0 0 10px 10px;padding:24px">

                    <!-- Ticket number -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px">
                      <tr>
                        <td align="center" style="background:#f8f8f7;border:1px solid #e5e3df;border-radius:8px;padding:12px 20px">
                          <p style="margin:0 0 2px;font-size:12px;color:#888888">Your ticket number</p>
                          <p style="margin:0;font-size:24px;font-weight:700;color:#185FA5">#${ticketId}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Message -->
                    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#444444">
                      Our support team has received your query and will get back to you within <strong>24 hours</strong>.
                    </p>

                    <!-- Footer -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-top:1px solid #e5e3df;padding-top:16px">
                          <p style="margin:0 0 10px;font-size:13px;color:#444444;font-weight:500;white-space:nowrap">Thank you for trusting Attendee with your organization.</p>
                          ${poweredBy}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    attachments: [{ filename: "Logo.webp", path: logoPath, cid: "vslogo" }],
  });

  console.log(`[Atty] Support email sent - ticket #${ticketId}`);
  return { sent: true };
};

module.exports = { sendSupportEmail };
