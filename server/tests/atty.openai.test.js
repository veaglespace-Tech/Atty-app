process.env.NODE_ENV = "test";

const baseContext = {
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

describe("askOpenAI rule-based fallback", () => {
  const originalKey = process.env.CEREBRAS_API_KEY;

  beforeEach(() => {
    delete process.env.CEREBRAS_API_KEY;
    jest.resetModules();
  });

  afterAll(() => {
    if (originalKey === undefined) {
      delete process.env.CEREBRAS_API_KEY;
    } else {
      process.env.CEREBRAS_API_KEY = originalKey;
    }
  });

  it("answers punch-in questions even when AI config is unavailable", async () => {
    const { askOpenAI } = require("../services/atty.openai");

    const result = await askOpenAI("How do I punch in?", baseContext);

    expect(result.topic).toBe("platform");
    expect(result.confidence).toBe("high");
    expect(result.answer).toMatch(/attendance|gps|radius|punch/i);
  });

  it("answers subscription questions from local context when AI is unavailable", async () => {
    const { askOpenAI } = require("../services/atty.openai");

    const result = await askOpenAI("What is my subscription status?", {
      ...baseContext,
      userId: 3,
      userName: "Alice Admin",
      userRole: "ORG_ADMIN",
      subscriptionStatus: "ACTIVE",
      planName: "Growth Plan",
    });

    expect(result.topic).toBe("platform");
    expect(result.confidence).toBe("high");
    expect(result.answer).toMatch(/active|growth plan|subscription/i);
  });

  it("treats unsupported features as platform questions instead of unrelated", async () => {
    const { askOpenAI } = require("../services/atty.openai");

    const result = await askOpenAI("Is QR check-in available?", baseContext);

    expect(result.topic).toBe("platform");
    expect(result.confidence).toBe("high");
    expect(result.answer).toMatch(/not available/i);
  });

  it("returns the familiar message for unrelated questions", async () => {
    const { askOpenAI } = require("../services/atty.openai");

    const result = await askOpenAI("Who will win today's cricket match?", baseContext);

    expect(result.topic).toBe("unrelated");
    expect(result.confidence).toBe("low");
    expect(result.answer).toBe(
      "I am not familiar with that. I can help only with Veagle Attendee related questions."
    );
  });
});
