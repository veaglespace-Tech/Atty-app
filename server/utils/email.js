const nodemailer = require("nodemailer");

const parseBooleanFlag = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const getMailerIdentity = () => {
  const user = String(
    process.env.EMAIL_USER || process.env.EMAIL || process.env.SMTP_USER || ""
  ).trim();
  const pass = String(process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();
  const fromName = String(process.env.EMAIL_FROM_NAME || "Veagle Attendee").trim();

  return {
    user,
    pass,
    fromName,
  };
};

const buildTransportOptions = () => {
  const { user, pass } = getMailerIdentity();
  if (!user || !pass) {
    return null;
  }

  const host = String(process.env.SMTP_HOST || "").trim();
  const configuredService = String(process.env.EMAIL_SERVICE || "").trim();
  const parsedPort = Number.parseInt(String(process.env.SMTP_PORT || "").trim(), 10);
  const port = Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 587;
  const secure = parseBooleanFlag(process.env.SMTP_SECURE) || port === 465;

  if (host) {
    return {
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    };
  }

  const service =
    configuredService || (user.toLowerCase().endsWith("@gmail.com") ? "gmail" : "");

  if (!service) {
    return null;
  }

  return {
    service,
    auth: {
      user,
      pass,
    },
  };
};

const sendEmail = async (options) => {
  try {
    const transportOptions = buildTransportOptions();
    const { user, fromName } = getMailerIdentity();

    if (!transportOptions || !user) {
      throw new Error(
        "Email delivery is not configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS or EMAIL_SERVICE/EMAIL_USER/EMAIL_PASS."
      );
    }

    const transporter = nodemailer.createTransport(transportOptions);

    const mailOptions = {
      from: `"${fromName}" <${user}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    return transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Nodemailer error:", error);
    throw error;
  }
};

module.exports = sendEmail;
