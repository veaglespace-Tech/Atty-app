const nodemailer = require("nodemailer");
const { Prisma } = require("@prisma/client");
const prisma = require("../lib/prisma");
const { buildEmailTemplate } = require("./email-template");

const DEFAULT_SMTP_HOST = "smtp.hostinger.com";
const DEFAULT_SMTP_PORT = 465;
const DEFAULT_DAILY_LIMIT = 100;
const DEFAULT_QUOTA_TIMEZONE =
  String(process.env.EMAIL_QUOTA_TIMEZONE || process.env.ATTENDANCE_TIMEZONE || "Asia/Kolkata").trim() ||
  "Asia/Kolkata";
const MAX_MAILBOXES = 20;
const USAGE_TABLE_NAME = "email_sender_usage";

const parseBooleanFlag = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const getConfiguredMailboxes = () => {
  const mailboxes = [];

  for (let index = 1; index <= MAX_MAILBOXES; index += 1) {
    const email = String(process.env[`EMAIL_${index}`] || "").trim().toLowerCase();
    const pass = String(process.env[`EMAIL_${index}_PASSWORD`] || "").trim();

    if (email && pass) {
      mailboxes.push({
        index,
        email,
        pass,
      });
    }
  }

  if (mailboxes.length > 0) {
    return mailboxes;
  }

  const legacyEmail = String(
    process.env.EMAIL_USER || process.env.EMAIL || process.env.SMTP_USER || ""
  )
    .trim()
    .toLowerCase();
  const legacyPass = String(process.env.EMAIL_PASS || process.env.SMTP_PASS || "").trim();

  if (!legacyEmail || !legacyPass) {
    return [];
  }

  return [
    {
      index: 0,
      email: legacyEmail,
      pass: legacyPass,
      legacy: true,
    },
  ];
};

const getDefaultMailboxEmail = () => {
  const mailboxes = getConfiguredMailboxes();
  return String(mailboxes[0]?.email || "").trim();
};

const hasHostingerMailboxPool = () => getConfiguredMailboxes().some((mailbox) => !mailbox.legacy);

const buildTransportOptions = ({ email, pass }) => {
  const useHostingerDefaults = hasHostingerMailboxPool();
  const host = String(
    process.env.SMTP_HOST || (useHostingerDefaults ? DEFAULT_SMTP_HOST : "")
  ).trim();
  const configuredService = String(process.env.EMAIL_SERVICE || "").trim();
  const parsedPort = Number.parseInt(
    String(process.env.SMTP_PORT || (useHostingerDefaults ? DEFAULT_SMTP_PORT : "")).trim(),
    10
  );
  const port =
    Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : useHostingerDefaults ? DEFAULT_SMTP_PORT : 587;
  const secure = parseBooleanFlag(process.env.SMTP_SECURE) || port === 465;

  if (host) {
    return {
      host,
      port,
      secure,
      auth: {
        user: email,
        pass,
      },
    };
  }

  const service = configuredService || (email.toLowerCase().endsWith("@gmail.com") ? "gmail" : "");
  if (!service) {
    return null;
  }

  return {
    service,
    auth: {
      user: email,
      pass,
    },
  };
};

const getUsageTableDefinition = () => `
  CREATE TABLE IF NOT EXISTS \`${USAGE_TABLE_NAME}\` (
    \`usageDate\` DATE NOT NULL,
    \`email\` VARCHAR(191) NOT NULL,
    \`sentCount\` INT NOT NULL DEFAULT 0,
    \`lastSentAt\` DATETIME(3) NULL,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`usageDate\`, \`email\`),
    INDEX \`${USAGE_TABLE_NAME}_usageDate_idx\` (\`usageDate\`),
    INDEX \`${USAGE_TABLE_NAME}_email_idx\` (\`email\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`;

const getTodayKey = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DEFAULT_QUOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
};

const ensureUsageTable = async (tx) => {
  await tx.$executeRawUnsafe(getUsageTableDefinition());
};

const seedUsageRows = async (tx, usageDate, mailboxes) => {
  for (const mailbox of mailboxes) {
    await tx.$executeRaw`
      INSERT IGNORE INTO ${Prisma.raw(`\`${USAGE_TABLE_NAME}\``)} (
        usageDate,
        email,
        sentCount,
        lastSentAt,
        createdAt,
        updatedAt
      )
      VALUES (
        ${usageDate},
        ${mailbox.email},
        0,
        NULL,
        NOW(3),
        NOW(3)
      )
    `;
  }
};

const reserveMailbox = async () => {
  const mailboxes = getConfiguredMailboxes();
  if (mailboxes.length === 0) {
    return null;
  }

  const dailyLimit = parsePositiveInt(process.env.EMAIL_DAILY_LIMIT, DEFAULT_DAILY_LIMIT);
  const usageDate = getTodayKey();

  return prisma.$transaction(async (tx) => {
    await ensureUsageTable(tx);
    await seedUsageRows(tx, usageDate, mailboxes);

    const usageRows = await tx.$queryRaw`
      SELECT
        email,
        sentCount,
        lastSentAt
      FROM ${Prisma.raw(`\`${USAGE_TABLE_NAME}\``)}
      WHERE usageDate = ${usageDate}
        AND email IN (${Prisma.join(mailboxes.map((mailbox) => mailbox.email))})
      FOR UPDATE
    `;

    const usageByEmail = new Map(
      (Array.isArray(usageRows) ? usageRows : []).map((row) => [String(row.email || "").toLowerCase(), row])
    );

    // Use EMAIL_1 until its daily limit is reached, then EMAIL_2, and so on.
    const selectedMailbox = mailboxes.find((mailbox) => {
      const usage = usageByEmail.get(mailbox.email);
      return Number(usage?.sentCount || 0) < dailyLimit;
    });

    if (!selectedMailbox) {
      throw new Error(
        `All configured email accounts have reached the daily limit of ${dailyLimit} messages.`
      );
    }

    await tx.$executeRaw`
      UPDATE ${Prisma.raw(`\`${USAGE_TABLE_NAME}\``)}
      SET
        sentCount = sentCount + 1,
        lastSentAt = NOW(3),
        updatedAt = NOW(3)
      WHERE usageDate = ${usageDate}
        AND email = ${selectedMailbox.email}
    `;

    return selectedMailbox;
  });
};

const sendEmail = async (options) => {
  try {
    const selectedMailbox = await reserveMailbox();
    const fallbackMailbox = getConfiguredMailboxes()[0] || null;
    const mailbox = selectedMailbox || fallbackMailbox;

    if (!mailbox) {
      throw new Error(
        "Email delivery is not configured. Add EMAIL_1..EMAIL_20 and EMAIL_1_PASSWORD..EMAIL_20_PASSWORD for Hostinger mailboxes, or keep the legacy EMAIL_USER/EMAIL_PASS fallback."
      );
    }

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

    return transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Nodemailer error:", error);
    throw error;
  }
};

module.exports = sendEmail;
module.exports.getConfiguredMailboxes = getConfiguredMailboxes;
module.exports.getDefaultMailboxEmail = getDefaultMailboxEmail;
module.exports.reserveMailbox = reserveMailbox;
