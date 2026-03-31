process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";
process.env.BYPASS_PROTECTED_ROUTES = "true";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  user: {
    findMany: jest.fn(),
  },
  contactInquiry: {
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
}));

jest.mock("../services/contact-inquiry.email", () => ({
  sendContactInquiryNotifications: jest.fn(),
}));

const prisma = require("../lib/prisma");
const {
  sendContactInquiryNotifications,
} = require("../services/contact-inquiry.email");
const { app } = require("../index");

describe("POST /api/contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores a contact inquiry and triggers notifications", async () => {
    prisma.contactInquiry.create.mockResolvedValue({
      id: 41,
      name: "John Doe",
      email: "john@example.com",
      subject: "Need a demo",
      message: "Please help me schedule a product demo.",
    });
    prisma.user.findMany.mockResolvedValue([{ email: "superadmin@example.com" }]);
    sendContactInquiryNotifications.mockResolvedValue({
      adminNotification: {
        sent: true,
        error: null,
      },
      requesterNotification: {
        sent: true,
        error: null,
      },
    });
    prisma.contactInquiry.update.mockResolvedValue({
      id: 41,
    });

    const response = await request(app).post("/api/contact").send({
      name: " John   Doe ",
      email: " JOHN@example.com ",
      subject: " Need a demo ",
      message: " Please help me schedule a product demo. ",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.inquiryId).toBe(41);
    expect(prisma.contactInquiry.create).toHaveBeenCalledWith({
      data: {
        name: "John Doe",
        email: "john@example.com",
        subject: "Need a demo",
        message: "Please help me schedule a product demo.",
      },
    });
    expect(sendContactInquiryNotifications).toHaveBeenCalledWith({
      inquiryId: 41,
      name: "John Doe",
      email: "john@example.com",
      subject: "Need a demo",
      message: "Please help me schedule a product demo.",
      superAdminEmails: expect.arrayContaining(["superadmin@example.com"]),
    });
    expect(prisma.contactInquiry.update).toHaveBeenCalledWith({
      where: {
        id: 41,
      },
      data: expect.objectContaining({
        adminNotificationError: null,
        requesterNotificationError: null,
      }),
    });
  });

  it("returns 400 when payload validation fails", async () => {
    const response = await request(app).post("/api/contact").send({
      name: "A",
      email: "not-an-email",
      subject: "Hi",
      message: "short",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/full name|email|subject|message/i);
    expect(prisma.contactInquiry.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/super-admin/contacts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns contact inquiries for the super admin dashboard", async () => {
    prisma.contactInquiry.findMany.mockResolvedValue([
      {
        id: 41,
        name: "John Doe",
        email: "john@example.com",
        subject: "Need a demo",
        message: "Please help me schedule a product demo.",
        status: "NEW",
        adminNotificationSentAt: new Date("2026-03-31T10:00:00.000Z"),
        adminNotificationError: null,
        requesterNotificationSentAt: null,
        requesterNotificationError: "SMTP unavailable",
        createdAt: new Date("2026-03-31T09:00:00.000Z"),
      },
    ]);

    const response = await request(app)
      .get("/api/super-admin/contacts")
      .set("x-test-role", "SUPER_ADMIN");

    expect(response.status).toBe(200);
    expect(response.body.summary[0].label).toBe("Inquiries");
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      id: 41,
      name: "John Doe",
      adminMailStatus: "SUCCESS",
      requesterMailStatus: "FAILED",
    });
    expect(prisma.contactInquiry.findMany).toHaveBeenCalledWith({
      orderBy: [{ createdAt: "desc" }],
      take: 250,
    });
  });
});
