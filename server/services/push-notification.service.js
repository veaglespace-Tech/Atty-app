const { Expo } = require("expo-server-sdk");
const prisma = require("../lib/prisma");
const { truncateText } = require("./common.service");

/**
 * Sends a push notification to all users in the organization/team about a new post
 *
 * @param {Object} post - The newly created post object
 * @param {number} authorId - The ID of the user who created the post (so they don't get notified)
 * @param {number} orgId - The organization ID
 * @param {number} [teamId] - The team ID if the post is scoped to a team
 */
exports.notifyNewPost = async (post, authorId, orgId, teamId = null) => {
  try {
    // 1. Fetch users that have push tokens
    const usersWithTokens = await prisma.user.findMany({
      where: {
        orgId,
        expoPushToken: { not: null },
        id: { not: authorId }, // don't notify the author
        ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
      },
      select: { expoPushToken: true },
    });

    if (!usersWithTokens.length) return;

    // 2. Prepare Expo Push API
    const expo = new Expo();
    let messages = [];

    // Helper to format the title based on post type
    const getNotificationTitle = (p) => {
      if (!p.type) return `New Post: ${p.title}`;
      const formattedType = p.type
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return `New ${formattedType}: ${p.title}`;
    };

    const notificationTitle = getNotificationTitle(post);

    // 3. Construct messages
    for (let user of usersWithTokens) {
      if (!Expo.isExpoPushToken(user.expoPushToken)) continue;
      
      messages.push({
        to: user.expoPushToken,
        sound: "default",
        channelId: "default", // Required for Android 8+ system tray visibility
        priority: "high",
        title: notificationTitle,
        body: truncateText(post.content, 100),
        data: { postId: post.id },
      });
    }

    if (!messages.length) return;

    // 4. Chunk messages and send in the background
    const chunks = expo.chunkPushNotifications(messages);
    
    // We execute this asynchronously so it doesn't block the API response
    (async () => {
      for (let chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error("Push notification chunk error:", error);
        }
      }
    })();

  } catch (error) {
    console.error("Failed to queue push notifications:", error);
  }
};
