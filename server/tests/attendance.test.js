process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";
process.env.BYPASS_PROTECTED_ROUTES = "true";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  organization: {
    findUnique: jest.fn(),
  },
  attendance: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  teamMember: {
    findFirst: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn((operations) => Promise.all(operations)),
}));

const prisma = require("../lib/prisma");
const { app } = require("../index");

describe("POST /api/attendance/punch-in", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("punches in successfully with a valid payload", async () => {
    prisma.organization.findUnique.mockResolvedValue({
      longitude: 72.8777,
      latitude: 19.076,
      attendanceRadius: 100,
    });
    prisma.attendance.findFirst.mockResolvedValue(null);
    prisma.teamMember.findFirst.mockResolvedValue(null);
    prisma.attendance.create.mockResolvedValue({
      id: 11,
      orgId: 3,
      userId: 9,
      date: "2026-03-18",
    });

    const response = await request(app)
      .post("/api/attendance/punch-in")
      .set("x-test-org-id", "3")
      .set("x-test-user-id", "9")
      .set("x-test-role", "MEMBER")
      .send({
        userLocation: [72.8777, 19.076],
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(prisma.attendance.create).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when location payload is missing", async () => {
    const response = await request(app)
      .post("/api/attendance/punch-in")
      .set("x-test-org-id", "3")
      .set("x-test-user-id", "9")
      .set("x-test-role", "MEMBER")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/location/i);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });
});
