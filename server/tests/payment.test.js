process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";
process.env.PAYU_MERCHANT_KEY = "test-key";
process.env.PAYU_MERCHANT_SALT = "test-salt";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  plan: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  organization: {
    findUnique: jest.fn(),
  },
  freeTrialClaim: {
    findFirst: jest.fn(),
  },
}));

const prisma = require("../lib/prisma");
const { app } = require("../index");

describe("POST /api/payment/create-order", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    prisma.plan.findFirst.mockResolvedValue({
      id: 2,
      code: "PRO",
      name: "Pro",
      price: 1999,
      currency: "INR",
      durationInDays: 90,
      isActive: true,
    });
  });

  it("blocks checkout before payment when organization email already exists", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue({
      id: 10,
      email: "existing-org@example.com",
    });

    const response = await request(app).post("/api/payment/create-order").send({
      planCode: "PRO",
      organization: {
        email: "existing-org@example.com",
      },
      admin: {
        email: "new-admin@example.com",
      },
    });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/organization with this email already exists/i);
  });

  it("continues current flow for valid new registration data", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.organization.findUnique.mockResolvedValue(null);

    const response = await request(app).post("/api/payment/create-order").send({
      planCode: "PRO",
      organization: {
        email: "new-org@example.com",
      },
      admin: {
        email: "new-admin@example.com",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.freeTrial).toBe(false);
    expect(response.body.payuParams).toBeDefined();
    expect(response.body.payuParams.key).toBe("test-key");
  });
});
