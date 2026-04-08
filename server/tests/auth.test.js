process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";

const request = require("supertest");

jest.mock("../lib/prisma", () => {
  const prisma = {
    organization: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  prisma.$transaction = jest.fn(async (input) =>
    typeof input === "function" ? input(prisma) : Promise.all(input)
  );

  return prisma;
});

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "signed-jwt-token"),
  verify: jest.fn(() => ({ id: 1 })),
}));

jest.mock("../services/profile-image.service", () => ({
  uploadProfileImage: jest.fn(),
  deleteProfileImage: jest.fn(),
}));

const prisma = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  uploadProfileImage,
  deleteProfileImage,
} = require("../services/profile-image.service");
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

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a super admin without requiring an organization id", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    prisma.user.create.mockResolvedValue({
      id: 42,
      name: "Platform Admin",
      email: "superadmin@example.com",
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Platform Admin",
      email: "superadmin@example.com",
      mobile: "9999999999",
      mobileCountryCode: "+91",
      password: "Secret123!",
      role: "SUPER_ADMIN",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe("superadmin@example.com");
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Platform Admin",
        email: "superadmin@example.com",
        mobile: "+919999999999",
        mobileCountryCode: "+91",
        password: "hashed-password",
        role: "SUPER_ADMIN",
        orgId: null,
        status: "APPROVED",
      },
    });
    expect(prisma.organizationMember.create).not.toHaveBeenCalled();
  });

  it("persists the requested organization role for non-superadmin registration", async () => {
    prisma.organization.findFirst.mockResolvedValue({
      id: 7,
      isBlocked: false,
      isActive: true,
      deletedAt: null,
      plan: {
        memberLimit: 100,
        maxUsers: 100,
      },
    });
    prisma.user.count.mockResolvedValue(0);
    prisma.user.findUnique.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue("hashed-password");
    prisma.user.create.mockResolvedValue({
      id: 43,
      name: "Workspace Admin",
      email: "admin@example.com",
    });

    const response = await request(app).post("/api/auth/register").send({
      name: "Workspace Admin",
      email: "admin@example.com",
      mobile: "8888888888",
      mobileCountryCode: "+91",
      password: "Secret123!",
      role: "ORG_ADMIN",
      organizationId: 7,
    });

    expect(response.status).toBe(201);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Workspace Admin",
        email: "admin@example.com",
        mobile: "+918888888888",
        mobileCountryCode: "+91",
        password: "hashed-password",
        role: "ORG_ADMIN",
        orgId: 7,
        status: "PENDING",
      },
    });
    expect(prisma.organizationMember.create).toHaveBeenCalledWith({
      data: {
        userId: 43,
        orgId: 7,
        role: "ORG_ADMIN",
        isActive: true,
        joinedAt: expect.any(Date),
      },
    });
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

describe("GET /api/auth/me", () => {
  const originalBypassProtectedRoutes = process.env.BYPASS_PROTECTED_ROUTES;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BYPASS_PROTECTED_ROUTES;
  });

  afterAll(() => {
    process.env.BYPASS_PROTECTED_ROUTES = originalBypassProtectedRoutes;
  });

  it("allows an org-less super admin platform account through token verification", async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 77,
        name: "Platform Admin",
        email: "superadmin@example.com",
        mobile: "+919999999999",
        mobileCountryCode: "+91",
        password: "hashed-password",
        role: "SUPER_ADMIN",
        permissions: [],
        status: "APPROVED",
        isActive: true,
        deletedAt: null,
        organization: null,
        memberships: [],
      })
      .mockResolvedValueOnce({
        id: 77,
        name: "Platform Admin",
        email: "superadmin@example.com",
        mobile: "+919999999999",
        mobileCountryCode: "+91",
        password: "hashed-password",
        role: "SUPER_ADMIN",
        permissions: [],
        status: "APPROVED",
        isActive: true,
        deletedAt: null,
        organization: null,
        memberships: [],
      });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer signed-jwt-token");

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe("superadmin@example.com");
    expect(response.body.user.currentRole).toBe("SUPER_ADMIN");
    expect(response.body.user.organization).toBeNull();
  });
});

describe("PATCH /api/auth/me", () => {
  const originalBypassProtectedRoutes = process.env.BYPASS_PROTECTED_ROUTES;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BYPASS_PROTECTED_ROUTES = "true";
  });

  afterAll(() => {
    process.env.BYPASS_PROTECTED_ROUTES = originalBypassProtectedRoutes;
  });

  it("uploads a new profile image and persists the returned url", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: "Bypass Test User",
      email: "bypass@test.local",
      mobile: "+919999999999",
      mobileCountryCode: "+91",
      role: "MEMBER",
      permissions: [],
      status: "APPROVED",
      isActive: true,
      profileImageUrl: null,
      profileImagePublicId: null,
      organization: null,
    });
    uploadProfileImage.mockResolvedValue({
      url: "https://res.cloudinary.com/demo/image/upload/v1/user-1.png",
      publicId: "veagle-attendee/profile-images/user-1",
    });
    prisma.user.update.mockResolvedValue({
      id: 1,
      name: "Bypass Test User",
      email: "bypass@test.local",
      mobile: "+919999999999",
      mobileCountryCode: "+91",
      role: "MEMBER",
      permissions: [],
      status: "APPROVED",
      isActive: true,
      profileImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/user-1.png",
      profileImagePublicId: "veagle-attendee/profile-images/user-1",
      organization: null,
    });

    const response = await request(app).patch("/api/auth/me").send({
      profileImageDataUrl: "data:image/png;base64,AAAA",
    });

    expect(response.status).toBe(200);
    expect(uploadProfileImage).toHaveBeenCalledWith({
      userId: 1,
      dataUrl: "data:image/png;base64,AAAA",
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        profileImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/user-1.png",
        profileImagePublicId: "veagle-attendee/profile-images/user-1",
      },
      include: {
        organization: {
          include: {
            plan: true,
          },
        },
      },
    });
    expect(response.body.user.profileImageUrl).toBe(
      "https://res.cloudinary.com/demo/image/upload/v1/user-1.png"
    );
  });

  it("removes an existing profile image and clears it from the database", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      name: "Bypass Test User",
      email: "bypass@test.local",
      mobile: "+919999999999",
      mobileCountryCode: "+91",
      role: "MEMBER",
      permissions: [],
      status: "APPROVED",
      isActive: true,
      profileImageUrl: "https://res.cloudinary.com/demo/image/upload/v1/user-1.png",
      profileImagePublicId: "veagle-attendee/profile-images/user-1",
      organization: null,
    });
    prisma.user.update.mockResolvedValue({
      id: 1,
      name: "Bypass Test User",
      email: "bypass@test.local",
      mobile: "+919999999999",
      mobileCountryCode: "+91",
      role: "MEMBER",
      permissions: [],
      status: "APPROVED",
      isActive: true,
      profileImageUrl: null,
      profileImagePublicId: null,
      organization: null,
    });

    const response = await request(app).patch("/api/auth/me").send({
      removeProfileImage: true,
    });

    expect(response.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        profileImageUrl: null,
        profileImagePublicId: null,
      },
      include: {
        organization: {
          include: {
            plan: true,
          },
        },
      },
    });
    expect(deleteProfileImage).toHaveBeenCalledWith(
      "veagle-attendee/profile-images/user-1"
    );
    expect(response.body.user.profileImageUrl).toBeNull();
  });
});
