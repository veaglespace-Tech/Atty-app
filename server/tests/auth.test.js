process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  $transaction: jest.fn(async (operations) => Promise.all(operations)),
  organization: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
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
    prisma.subscription.findFirst.mockResolvedValue({
      id: 11,
      orgId: 3,
      planId: 2,
      planName: "Pro",
      planCode: "PRO_3M",
      amount: 4500,
      currency: "INR",
      status: "ACTIVE",
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    });
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 });
    prisma.subscription.update.mockResolvedValue({ id: 11 });
    prisma.organization.update.mockResolvedValue({
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
      subscriptionExpiry: new Date("2026-12-31T00:00:00.000Z"),
      subscriptionId: 11,
      planId: 2,
    });
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

  it("logs in successfully when the organization name is typed instead of selected", async () => {
    prisma.subscription.findFirst.mockResolvedValue({
      id: 11,
      orgId: 3,
      planId: 2,
      planName: "Pro",
      planCode: "PRO_3M",
      amount: 4500,
      currency: "INR",
      status: "ACTIVE",
      endDate: new Date("2026-12-31T00:00:00.000Z"),
    });
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 });
    prisma.subscription.update.mockResolvedValue({ id: 11 });
    prisma.organization.update.mockResolvedValue({
      id: 3,
      name: "Veagle Space Technologies Pvt Ltd",
      organizationCode: "VEAGLE01",
      city: "Pune",
      state: "MH",
      country: "India",
      isBlocked: false,
      isActive: true,
      deletedAt: null,
      subscriptionStatus: "ACTIVE",
      subscriptionExpiry: new Date("2026-12-31T00:00:00.000Z"),
      subscriptionId: 11,
      planId: 2,
    });
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
        name: "Veagle Space Technologies Pvt Ltd",
        organizationCode: "VEAGLE01",
        city: "Pune",
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
      organizationName: "Veagle Space Technology Pvt Ltd",
      loginAs: "ORG_ADMIN",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBe("signed-jwt-token");
    expect(response.body.user.organization.name).toBe("Veagle Space Technologies Pvt Ltd");
  });

  it("returns 400 when login payload is invalid", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "wrong-email",
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/email|password/i);
  });
});

describe("GET /api/auth/organizations/search", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns matching organizations from the database", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 3,
        name: "Acme Workspace",
        organizationCode: "ACME01",
        city: "Mumbai",
        state: "MH",
        country: "India",
      },
    ]);

    const response = await request(app).get("/api/auth/organizations/search").query({
      query: "Acme",
      limit: 5,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].organizationCode).toBe("ACME01");
    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        isActive: true,
        isBlocked: false,
        OR: [
          { name: { contains: "Acme" } },
          { organizationCode: { contains: "Acme" } },
          { city: { contains: "Acme" } },
          { state: { contains: "Acme" } },
          { country: { contains: "Acme" } },
        ],
      },
      select: {
        id: true,
        name: true,
        organizationCode: true,
        city: true,
        state: true,
        country: true,
      },
      orderBy: [{ name: "asc" }],
      take: 5,
    });
  });
});
