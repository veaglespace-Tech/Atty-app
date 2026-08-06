const { Expo } = require("expo-server-sdk");

class ExpoPushProvider {
  constructor() {
    this.expo = new Expo(
      process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined
    );
  }

  isExpoToken(token) {
    return Boolean(token && typeof token === "string" && Expo.isExpoPushToken(token));
  }

  buildMessage({ token, title, body, data = {}, imageUrl = null, sound = "default", channelId = "default", priority = "high" }) {
    const message = {
      to: token,
      sound,
      channelId,
      priority,
      title,
      body,
      data: {
        ...data,
        ...(imageUrl ? { imageUrl, image: imageUrl } : {}),
      },
    };

    if (imageUrl) {
      message.image = imageUrl;
      message.mutableContent = true;
      message.attachments = [{ url: imageUrl }];
    }

    return message;
  }

  async sendMessages(messages) {
    if (!messages || messages.length === 0) return { successCount: 0, failureCount: 0 };

    const chunks = this.expo.chunkPushNotifications(messages);
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        for (const ticket of tickets) {
          if (ticket.status === "ok") {
            successCount++;
          } else {
            failureCount++;
            console.error(`[EXPO PUSH ERROR] Ticket error: ${ticket.message} (details: ${JSON.stringify(ticket.details || {})})`);
          }
        }
      } catch (error) {
        failureCount += chunk.length;
        console.error(`[EXPO PUSH ERROR] Failed to send chunk ${i + 1}/${chunks.length}:`, error.message);
      }
    }

    return { successCount, failureCount };
  }
}

module.exports = new ExpoPushProvider();
