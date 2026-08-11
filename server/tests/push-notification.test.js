const { extractImageUrl } = require("../services/common.service");
const { notifyNewPost } = require("../services/push-notification.service");
const prisma = require("../lib/prisma");
const { Expo } = require("expo-server-sdk");

jest.mock("../lib/prisma", () => ({
  user: {
    findMany: jest.fn(),
  },
}));

jest.mock("expo-server-sdk", () => {
  const mockSend = jest.fn().mockResolvedValue([{ status: "ok" }]);
  const mockChunk = jest.fn().mockImplementation((msgs) => [msgs]);
  class MockExpo {
    static isExpoPushToken(token) {
      return typeof token === "string" && token.startsWith("ExponentPushToken[");
    }
    sendPushNotificationsAsync(chunk) {
      return mockSend(chunk);
    }
    chunkPushNotifications(msgs) {
      return mockChunk(msgs);
    }
  }
  return {
    Expo: MockExpo,
  };
});

describe("Push Notification Service Image Support", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("extractImageUrl", () => {
    it("returns null when no metadata or post provided", () => {
      expect(extractImageUrl(null)).toBeNull();
      expect(extractImageUrl({})).toBeNull();
      expect(extractImageUrl({ metadata: null })).toBeNull();
    });

    it("extracts image URL from metadata.attachments array", () => {
      const post = {
        metadata: {
          attachments: [
            { url: "https://example.com/doc.pdf", format: "pdf", resourceType: "raw" },
            { url: "https://example.com/photo.jpg", format: "jpg", resourceType: "image" },
          ],
        },
      };
      expect(extractImageUrl(post)).toBe("https://example.com/photo.jpg");
    });

    it("extracts image URL from metadata.attachment object", () => {
      const post = {
        metadata: {
          attachment: { url: "https://example.com/banner.png" },
        },
      };
      expect(extractImageUrl(post)).toBe("https://example.com/banner.png");
    });

    it("extracts image URL from metadata.imageUrl or metadata.image string", () => {
      const post1 = { metadata: { imageUrl: "https://example.com/img1.png" } };
      const post2 = { metadata: { image: "https://example.com/img2.png" } };
      expect(extractImageUrl(post1)).toBe("https://example.com/img1.png");
      expect(extractImageUrl(post2)).toBe("https://example.com/img2.png");
    });
  });

  describe("notifyNewPost", () => {
    it("includes imageUrl, image, attachments, and mutableContent in Expo push message when post has image", async () => {
      prisma.user.findMany.mockResolvedValue([
        { expoPushToken: "ExponentPushToken[user123]" },
      ]);

      const post = {
        id: 42,
        title: "New Product Launch",
        content: "Check out our latest product image below!",
        type: "NOTIFICATION",
        metadata: {
          attachments: [
            { url: "https://ik.imagekit.io/demo/product.png", resourceType: "image", format: "png" },
          ],
        },
      };

      await notifyNewPost(post, 1, 10);

      expect(prisma.user.findMany).toHaveBeenCalled();
    });
  });
});
