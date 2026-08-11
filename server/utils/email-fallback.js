const nodemailer = require("nodemailer");
const { buildEmailTemplate } = require("./email-template");

const sendEmailWithFallback = async (options, emailModule) => {
  const { reserveMailbox, getConfiguredMailboxes, buildTransportOptions } = emailModule;
  const configuredMailboxes = getConfiguredMailboxes();
  const maxAttempts = configuredMailboxes.length > 0 ? configuredMailboxes.length : 1;
  const excludeEmails = [];
  let lastError = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let currentMailboxEmail = null;
    try {
      const selectedMailbox = await reserveMailbox(excludeEmails);
      const fallbackMailbox = configuredMailboxes[0] || null;
      const mailbox = selectedMailbox || fallbackMailbox;

      if (!mailbox) {
        throw new Error(
          "Email delivery is not configured. Add EMAIL_1..EMAIL_20 and EMAIL_1_PASSWORD..EMAIL_20_PASSWORD for Hostinger mailboxes, or keep the legacy EMAIL_USER/EMAIL_PASS fallback."
        );
      }

      currentMailboxEmail = mailbox.email;

      const transportOptions = buildTransportOptions({
        email: mailbox.email,
        pass: mailbox.pass,
      });

      if (!transportOptions) {
        throw new Error(
          "Email delivery is not configured. Add SMTP_HOST=imap.hostinger.com and the Hostinger mailbox credentials, or configure EMAIL_SERVICE/EMAIL_USER/EMAIL_PASS."
        );
      }

      const transporter = nodemailer.createTransport(transportOptions);

      const mailOptions = {
        from: options.from || `"${options.fromName || "Veagle Attendee"}" <${mailbox.email}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html:
          options.html ||
          (options.intro || options.sections ? buildEmailTemplate(options) : undefined),
        replyTo: options.replyTo || undefined,
        attachments: Array.isArray(options.attachments) ? options.attachments : undefined,
      };

      const result = await transporter.sendMail(mailOptions);
      // Return successfully
      return result;
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed with mailbox ${currentMailboxEmail || 'unknown'}:`, error);
      lastError = error;
      
      if (currentMailboxEmail) {
        // Exclude this mailbox so next iteration picks a different one
        excludeEmails.push(currentMailboxEmail);
      } else {
        // If we couldn't even pick a mailbox, we should break out
        break;
      }
    }
  }

  console.error("All email fallback attempts failed. Final error:", lastError);
  throw lastError;
};

module.exports = sendEmailWithFallback;
