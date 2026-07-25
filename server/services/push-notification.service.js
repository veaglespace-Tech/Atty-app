const { Expo } = require("expo-server-sdk");
const prisma = require("../lib/prisma");
const { truncateText } = require("./common.service");
exports.notifyNewPost = async (post, authorId, orgId, teamId = null) => {
  try {
    console.log(`[DEBUG PUSH NOTIF] notifyNewPost called for post: ${post.id}, authorId: ${authorId}, orgId: ${orgId}, teamId: ${teamId}`);
    const usersWithTokens = await prisma.user.findMany({
      where: {
        orgId,
        expoPushToken: { not: null },
        id: { not: authorId }, 
        ...(teamId ? { teamMemberships: { some: { teamId } } } : {}),
      },
      select: { expoPushToken: true },
    });
    console.log(`[DEBUG PUSH NOTIF] Found ${usersWithTokens.length} users with push tokens`);
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
      if (!Expo.isExpoPushToken(user.expoPushToken)) {
        console.log(`[DEBUG PUSH NOTIF] Invalid push token: ${user.expoPushToken}`);
        continue;
      }
      
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
    console.log(`[DEBUG PUSH NOTIF] Prepared ${messages.length} valid messages for sending`);
    if (!messages.length) return;
    const chunks = expo.chunkPushNotifications(messages);
    console.log(`[DEBUG PUSH NOTIF] Created ${chunks.length} chunks of notifications`);
    
    // Run in background so it doesn't block the API response
    (async () => {
      for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];
        try {
          console.log(`[DEBUG PUSH NOTIF] Sending chunk ${i + 1}/${chunks.length} with ${chunk.length} messages...`);
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          console.log(`[DEBUG PUSH NOTIF] Chunk ${i + 1} sent successfully. Tickets: ${JSON.stringify(tickets)}`);
        } catch (error) {
          console.error(`[DEBUG PUSH NOTIF ERROR] Error sending chunk ${i + 1}:`, error);
        }
      }
    })();
  } catch (error) {
    console.error("[DEBUG PUSH NOTIF ERROR] Failed to queue push notifications:", error);
  }
};
