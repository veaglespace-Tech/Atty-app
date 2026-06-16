process.env.NODE_ENV = "test";
process.env.EMAIL_DAILY_LIMIT = "100";
process.env.EMAIL_QUOTA_TIMEZONE = "Asia/Kolkata";
process.env.EMAIL_1 = "atty@info.veaglespace.com";
process.env.EMAIL_1_PASSWORD = "pass-1";
process.env.EMAIL_2 = "atty1@info.veaglespace.com";
process.env.EMAIL_2_PASSWORD = "pass-2";
process.env.SMTP_HOST = "smtp.hostinger.com";
process.env.SMTP_PORT = "465";
process.env.SMTP_SECURE = "true";

jest.mock("../lib/prisma", () => {
  const tx = {
    $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    $executeRaw: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn(),
  };

  return {
    __tx: tx,
    $transaction: jest.fn(async (callback) => callback(tx)),
  };
});

jest.mock("nodemailer", () => ({
  createTransport: jest.fn(),
}));

const prisma = require("../lib/prisma");
const nodemailer = require("nodemailer");
const sendEmail = require("../utils/email");

describe("email rotation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("uses EMAIL_1 while it is still under the daily limit", async () => {
    prisma.__tx.$queryRaw.mockResolvedValue([
      {
        email: "atty@info.veaglespace.com",
        sentCount: 42,
        lastSentAt: new Date("2026-06-16T01:00:00.000Z"),
      },
      {
        email: "atty1@info.veaglespace.com",
        sentCount: 0,
        lastSentAt: null,
      },
    ]);

    const sendMail = jest.fn().mockResolvedValue({ accepted: ["recipient@example.com"] });
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
      email: "recipient@example.com",
      subject: "Daily update",
      message: "Hello from the mailbox pool",
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: {
          user: "atty@info.veaglespace.com",
          pass: "pass-1",
        },
      })
    );
  });

  it("uses the next Hostinger mailbox when the first one reaches the daily limit", async () => {
    prisma.__tx.$queryRaw.mockResolvedValue([
      {
        email: "atty@info.veaglespace.com",
        sentCount: 100,
        lastSentAt: new Date("2026-06-16T01:00:00.000Z"),
      },
      {
        email: "atty1@info.veaglespace.com",
        sentCount: 24,
        lastSentAt: new Date("2026-06-16T02:00:00.000Z"),
      },
    ]);

    const sendMail = jest.fn().mockResolvedValue({ accepted: ["recipient@example.com"] });
    nodemailer.createTransport.mockReturnValue({ sendMail });

    await sendEmail({
      email: "recipient@example.com",
      subject: "Daily update",
      message: "Hello from the mailbox pool",
    });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
          user: "atty1@info.veaglespace.com",
          pass: "pass-2",
        },
      })
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Veagle Attendee" <atty1@info.veaglespace.com>',
        to: "recipient@example.com",
        subject: "Daily update",
      })
    );
  });

  it("throws when every configured mailbox has reached the daily limit", async () => {
    prisma.__tx.$queryRaw.mockResolvedValue([
      {
        email: "atty@info.veaglespace.com",
        sentCount: 100,
        lastSentAt: new Date("2026-06-16T01:00:00.000Z"),
      },
      {
        email: "atty1@info.veaglespace.com",
        sentCount: 100,
        lastSentAt: new Date("2026-06-16T02:00:00.000Z"),
      },
    ]);

    await expect(
      sendEmail({
        email: "recipient@example.com",
        subject: "Daily update",
        message: "Hello from the mailbox pool",
      })
    ).rejects.toThrow("All configured email accounts have reached the daily limit of 100 messages.");
  });
});
