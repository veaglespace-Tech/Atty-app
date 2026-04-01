process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";
process.env.BYPASS_PROTECTED_ROUTES = "true";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  organization: {
    findMany: jest.fn(),
  },
  payment: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
}));

const prisma = require("../lib/prisma");
const { app } = require("../index");

describe("GET /api/super-admin/organizations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns organization records with aggregated payment details", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 11,
        name: "Acme Workspace",
        organizationCode: "ACME01",
        email: "ops@acme.test",
        phone: "+919999999999",
        phoneCountryCode: "+91",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiry: new Date("2026-12-31T00:00:00.000Z"),
        isBlocked: false,
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: {
          name: "Pro",
          code: "PRO",
        },
        orgAdmin: {
          name: "Alice Admin",
          email: "alice@acme.test",
          mobile: "+919888888888",
          mobileCountryCode: "+91",
        },
        _count: {
          users: 24,
          teams: 3,
        },
      },
    ]);

    prisma.payment.groupBy.mockResolvedValue([
      {
        orgId: 11,
        _count: { _all: 4 },
        _sum: { amount: 7200 },
        _max: { createdAt: new Date("2026-03-20T10:00:00.000Z") },
      },
    ]);

    const response = await request(app).get("/api/super-admin/organizations").query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      name: "Acme Workspace",
      code: "ACME01",
      adminName: "Alice Admin",
      adminEmail: "alice@acme.test",
      successfulPayments: 4,
      totalRevenue: 7200,
    });
  });
});

describe("GET /api/super-admin/organizations/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a pdf attachment for organization exports", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 11,
        name: "Acme Workspace",
        organizationCode: "ACME01",
        email: "ops@acme.test",
        phone: "+919999999999",
        phoneCountryCode: "+91",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiry: new Date("2026-12-31T00:00:00.000Z"),
        isBlocked: false,
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: {
          name: "Pro",
          code: "PRO",
        },
        orgAdmin: {
          name: "Alice Admin",
          email: "alice@acme.test",
          mobile: "+919888888888",
          mobileCountryCode: "+91",
        },
        _count: {
          users: 24,
          teams: 3,
        },
      },
    ]);

    prisma.payment.groupBy.mockResolvedValue([
      {
        orgId: 11,
        _count: { _all: 4 },
        _sum: { amount: 7200 },
        _max: { createdAt: new Date("2026-03-20T10:00:00.000Z") },
      },
    ]);

    const response = await request(app).get("/api/super-admin/organizations/pdf").query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/pdf/);
    expect(response.headers["content-disposition"]).toMatch(/super-admin-organizations-records\.pdf/);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

describe("GET /api/super-admin/organizations/excel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an excel attachment for organization exports", async () => {
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 11,
        name: "Acme Workspace",
        organizationCode: "ACME01",
        email: "ops@acme.test",
        phone: "+919999999999",
        phoneCountryCode: "+91",
        subscriptionStatus: "ACTIVE",
        subscriptionExpiry: new Date("2026-12-31T00:00:00.000Z"),
        isBlocked: false,
        isActive: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        plan: {
          name: "Pro",
          code: "PRO",
        },
        orgAdmin: {
          name: "Alice Admin",
          email: "alice@acme.test",
          mobile: "+919888888888",
          mobileCountryCode: "+91",
        },
        _count: {
          users: 24,
          teams: 3,
        },
      },
    ]);

    prisma.payment.groupBy.mockResolvedValue([
      {
        orgId: 11,
        _count: { _all: 4 },
        _sum: { amount: 7200 },
        _max: { createdAt: new Date("2026-03-20T10:00:00.000Z") },
      },
    ]);

    const response = await request(app).get("/api/super-admin/organizations/excel").query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/
    );
    expect(response.headers["content-disposition"]).toMatch(/super-admin-organizations-records\.xlsx/);
    expect(Number(response.headers["content-length"] || 0)).toBeGreaterThan(0);
  });
});

describe("GET /api/super-admin/payments/pdf", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a pdf attachment for payment exports", async () => {
    prisma.payment.findMany.mockResolvedValue([
      {
        id: 7,
        planName: "Pro Annual",
        planCode: "PRO",
        amount: 2400,
        currency: "INR",
        status: "SUCCESS",
        gateway: "RAZORPAY",
        razorpayOrderId: "order_123",
        razorpayPaymentId: "pay_123",
        createdAt: new Date("2026-03-21T08:00:00.000Z"),
        organization: {
          name: "Acme Workspace",
          organizationCode: "ACME01",
        },
        user: {
          name: "Alice Admin",
          email: "alice@acme.test",
        },
      },
    ]);

    prisma.payment.aggregate.mockResolvedValue({
      _sum: { amount: 2400 },
      _count: { _all: 1 },
    });

    const response = await request(app).get("/api/super-admin/payments/pdf").query({ limit: 20 });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/application\/pdf/);
    expect(response.headers["content-disposition"]).toMatch(/super-admin-payments-records\.pdf/);
    expect(response.body.length).toBeGreaterThan(0);
  });
});

const { resolveManagedSubscriptionWindow } = require("../services/subscription.service");

describe("resolveManagedSubscriptionWindow", () => {
  it("recalculates endDate when startDate changes and no endDate is provided", () => {
    const { startDate, endDate } = resolveManagedSubscriptionWindow({
      currentStartDate: new Date("2023-02-01T00:00:00.000Z"),
      currentEndDate: new Date("2023-05-01T00:00:00.000Z"),
      startDateInput: "2023-03-01",
      durationInDays: 90,
      forceEndDateRecalc: true,
    });

    expect(startDate.toISOString()).toBe("2023-03-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2023-05-30T00:00:00.000Z");
  });

  it("recalculates endDate on plan change with existing startDate when no date patch is provided", () => {
    const { startDate, endDate } = resolveManagedSubscriptionWindow({
      currentStartDate: new Date("2023-02-01T00:00:00.000Z"),
      currentEndDate: new Date("2023-05-01T00:00:00.000Z"),
      durationInDays: 180,
      forceEndDateRecalc: true,
    });

    expect(startDate.toISOString()).toBe("2023-02-01T00:00:00.000Z");
    expect(endDate.toISOString()).toBe("2023-07-31T00:00:00.000Z");
  });
});
