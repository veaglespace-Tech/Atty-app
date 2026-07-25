const { Expo } = require("expo-server-sdk");
const prisma = require("../lib/prisma");
const { truncateText } = require("./common.service");
exports.notifyNewPost = async (post, authorId, orgId, teamId = null) => {
  try {
    const usersWithTokens = await prisma.user.findMany({
      where: {
        orgId,
        expoPushToken: { not: null },
        id: { not: authorId }, 
        ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
      },
      select: { expoPushToken: true },
    });
    if (!usersWithTokens.length) return;
    const expo = new Expo();
    let messages = [];
    const getNotificationTitle = (p) => {
      if (!p.type) return `New Post: ${p.title}`;
      const formattedType = p.type
        .split("_")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
      return `New ${formattedType}: ${p.title}`;
    };
    const notificationTitle = getNotificationTitle(post);
    for (let user of usersWithTokens) {
      if (!Expo.isExpoPushToken(user.expoPushToken)) continue;
      
      messages.push({
        to: user.expoPushToken,
        sound: "default",
        channelId: "default", 
        priority: "high",
        title: notificationTitle,
        body: truncateText(post.content, 100),
        data: { postId: post.id },
      });
    }
    if (!messages.length) return;
    const chunks = expo.chunkPushNotifications(messages);
    
    // Run in background so it doesn't block the API response
    (async () => {
      for (let chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error("Push notification error:", error);
        }
      }
    })();
  } catch (error) {
    console.error("Failed to queue push notifications:", error);
  }
};
