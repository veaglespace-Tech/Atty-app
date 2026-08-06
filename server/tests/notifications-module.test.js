const prisma = require("../lib/prisma");
const {
  notificationService,
  notifyPost,
  notifyRequest,
  notifyAlert,
  sendPushToUsers,
  expoProvider,
  firebaseProvider,
} = require("../services/notifications");

jest.mock("../lib/prisma", () => ({
  user: {
    findMany: jest.fn(),
  },
}));

jest.mock("../services/notifications/providers/expo.provider", () => {
  const original = jest.requireActual("../services/notifications/providers/expo.provider");
  return {
    isExpoToken: jest.fn((token) => typeof token === "string" && token.startsWith("ExponentPushToken[")),
    buildMessage: jest.fn(original.buildMessage.bind(original)),
    sendMessages: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
  };
});

jest.mock("../services/notifications/providers/firebase.provider", () => ({
  isConfigured: jest.fn().mockReturnValue(true),
  isNativeFcmToken: jest.fn((token) => typeof token === "string" && !token.startsWith("ExponentPushToken[")),
  sendMulticast: jest.fn().mockResolvedValue({ successCount: 1, failureCount: 0 }),
}));

describe("Modular Notification System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendPushToUsers", () => {
    it("routes ExponentPushToken to expoProvider", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 10, expoPushToken: "ExponentPushToken[device123]" },
      ]);

      await sendPushToUsers({
        userIds: [10],
        title: "Test Title",
        body: "Test Body",
      });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(expoProvider.sendMessages).toHaveBeenCalled();
      expect(firebaseProvider.sendMulticast).not.toHaveBeenCalled();
    });

    it("routes native tokens to firebaseProvider", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 20, expoPushToken: "fcm_native_device_token_xyz" },
      ]);

      await sendPushToUsers({
        userIds: [20],
        title: "FCM Test",
        body: "Native FCM Body",
      });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(firebaseProvider.sendMulticast).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: ["fcm_native_device_token_xyz"],
          title: "FCM Test",
          body: "Native FCM Body",
        })
      );
    });
  });

  describe("notifyPost", () => {
    it("formats title, body, and image and calls sendPushToUsers", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 2, expoPushToken: "ExponentPushToken[member1]" },
      ]);

      const post = {
        id: 99,
        title: "Company Holiday Notice",
        content: "Office will remain closed on Friday.",
        type: "ANNOUNCEMENT",
        orgId: 1,
      };

      await notifyPost({ post, authorId: 1, orgId: 1 });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(expoProvider.sendMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: "New Announcement: Company Holiday Notice",
            body: "Office will remain closed on Friday.",
          }),
        ])
      );
    });
  });

  describe("notifyRequest", () => {
    it("dispatches request notifications to target users", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 5, expoPushToken: "ExponentPushToken[admin1]" },
      ]);

      await notifyRequest({
        type: "REGULARIZATION",
        requester: { id: 3, name: "John Doe" },
        targetUserIds: [5],
        orgId: 1,
      });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(expoProvider.sendMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: "New REGULARIZATION Request",
            body: "John Doe submitted a new regularization request.",
          }),
        ])
      );
    });
  });

  describe("notifyAlert", () => {
    it("dispatches custom system alerts", async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 1, expoPushToken: "ExponentPushToken[all]" },
      ]);

      await notifyAlert({
        title: "System Maintenance",
        message: "Server will restart in 10 minutes",
        orgId: 1,
      });

      expect(prisma.user.findMany).toHaveBeenCalled();
      expect(expoProvider.sendMessages).toHaveBeenCalled();
    });
  });
});
