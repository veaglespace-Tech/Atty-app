process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "signed-jwt-token"),
}));

const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { app } = require("../index");

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs in successfully with valid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 7,
      name: "Alice Admin",
      email: "alice@example.com",
      mobile: "+919999999999",
      mobileCountryCode: "+91",
      password: "hashed-password",
      role: "ORG_ADMIN",
      permissions: [],
      status: "APPROVED",
      isActive: true,
      deletedAt: null,
      organization: {
        id: 3,
        name: "Acme Workspace",
        organizationCode: "ACME01",
        city: "Mumbai",
        state: "MH",
        country: "India",
        isBlocked: false,
        isActive: true,
        deletedAt: null,
        subscriptionStatus: "ACTIVE",
        plan: {
          id: 2,
          name: "Pro",
          code: "PRO",
          memberLimit: 100,
          maxUsers: 100,
        },
      },
    });
    bcrypt.compare.mockResolvedValue(true);
    prisma.user.update.mockResolvedValue({ id: 7 });

    const response = await request(app).post("/api/auth/login").send({
      email: "alice@example.com",
      password: "Secret123!",
      organizationId: 3,
      loginAs: "ORG_ADMIN",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe("signed-jwt-token");
    expect(response.body.user.email).toBe("alice@example.com");
    expect(jwt.sign).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when login payload is invalid", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "wrong-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/email|password/i);
  });
});
