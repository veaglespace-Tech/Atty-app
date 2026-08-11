process.env.NODE_ENV = "test";
process.env.JWT_KEY = "test-secret";
process.env.BYPASS_PROTECTED_ROUTES = "false";

const request = require("supertest");

jest.mock("../lib/prisma", () => ({
  user: {
    findUnique: jest.fn(),
  },
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../services/atty.context", () => ({
  buildAttyContext: jest.fn(),
}));

jest.mock("../services/atty.openai", () => ({
  askOpenAI: jest.fn(),
}));

const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const { buildAttyContext } = require("../services/atty.context");
const { askOpenAI } = require("../services/atty.openai");
const { app } = require("../index");

const guestContext = {
  userId: null,
  userName: "Guest",
  userRole: "GUEST",
  orgId: null,
  orgName: null,
  orgCode: null,
  subscriptionStatus: "NONE",
  subscriptionExpiry: null,
  planName: null,
  planCode: null,
  maxUsers: null,
  maxTeams: null,
  teams: [],
  permissions: [],
};

const superAdminUser = {
  id: 7,
  name: "Alice Admin",
  email: "alice@example.com",
  role: "SUPER_ADMIN",
  isActive: true,
  status: "APPROVED",
  deletedAt: null,
  organization: null,
  memberships: [],
};

describe("POST /api/atty/chat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    buildAttyContext.mockResolvedValue(guestContext);
  });

  it("answers platform questions for guests without showing the support form", async () => {
    askOpenAI.mockResolvedValue({
      answer: "You can punch in from the Attendance section after turning on GPS.",
      confidence: "high",
      topic: "platform",
      suggestedActions: [],
    });

    const response = await request(app).post("/api/atty/chat").send({
      message: "How do I punch in?",
    });

    expect(response.status).toBe(200);
    expect(buildAttyContext).toHaveBeenCalledWith(null);
    expect(askOpenAI).toHaveBeenCalledWith("How do I punch in?", guestContext);
    expect(response.body).toMatchObject({
      answer: "You can punch in from the Attendance section after turning on GPS.",
      confidence: "high",
      topic: "platform",
      showForm: false,
    });
  });

  it("does not show the support form for unrelated guest questions", async () => {
    askOpenAI.mockResolvedValue({
      answer: "I am not familiar with that. I can help only with Veagle Attendee related questions.",
      confidence: "low",
      topic: "unrelated",
      suggestedActions: [],
    });

    const response = await request(app).post("/api/atty/chat").send({
      message: "Who will win today's cricket match?",
    });

    expect(response.status).toBe(200);
    expect(response.body.showForm).toBe(false);
    expect(response.body.topic).toBe("unrelated");
  });

  it("shows the support form only for unrelated logged-in questions", async () => {
    jwt.verify.mockReturnValue({ id: 7 });
    prisma.user.findUnique.mockResolvedValue(superAdminUser);
    buildAttyContext.mockResolvedValue({
      ...guestContext,
      userId: 7,
      userName: "Alice Admin",
      userRole: "SUPER_ADMIN",
    });
    askOpenAI.mockResolvedValue({
      answer: "I am not familiar with that. I can help only with Veagle Attendee related questions.",
      confidence: "low",
      topic: "unrelated",
      suggestedActions: [],
    });

    const response = await request(app)
      .post("/api/atty/chat")
      .set("Authorization", "Bearer valid-token")
      .send({
        message: "Tell me a cake recipe",
      });

    expect(response.status).toBe(200);
    expect(response.body.showForm).toBe(true);
    expect(response.body.topic).toBe("unrelated");
  });

  it("treats invalid tokens as guest chat instead of failing the request", async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error("invalid token");
    });
    askOpenAI.mockResolvedValue({
      answer: "Reports are available from the Reports section.",
      confidence: "high",
      topic: "platform",
      suggestedActions: [],
    });

    const response = await request(app)
      .post("/api/atty/chat")
      .set("Authorization", "Bearer stale-token")
      .send({
        message: "How do I generate reports?",
      });

    expect(response.status).toBe(200);
    expect(buildAttyContext).toHaveBeenCalledWith(null);
    expect(response.body.showForm).toBe(false);
  });
});
