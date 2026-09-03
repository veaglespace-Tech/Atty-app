const { Expo } = require("expo-server-sdk");
const prisma = require("../../../lib/prisma");

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
    const staleTokens = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        console.log(
          `[EXPO PUSH TICKETS] Chunk ${i + 1}/${chunks.length}:`,
          JSON.stringify(tickets, null, 2)
        );


        // Get Expo push receipts
const receiptIds = tickets
  .filter((ticket) => ticket.status === "ok" && ticket.id)
  .map((ticket) => ticket.id);

if (receiptIds.length > 0) {
  // Wait briefly for Expo to generate receipts
  await new Promise((resolve) => setTimeout(resolve, 2000));

  try {
    const receipts =
      await this.expo.getPushNotificationReceiptsAsync(receiptIds);

    console.log(
      "[EXPO PUSH RECEIPTS]",
      JSON.stringify(receipts, null, 2)
    );
  } catch (receiptError) {
    console.error(
      "[EXPO RECEIPT ERROR]",
      receiptError.message
    );
  }
}

        
        for (let j = 0; j < tickets.length; j++) {
          const ticket = tickets[j];
          const targetToken = chunk[j]?.to;

          if (ticket.status === "ok") {
            successCount++;
          } else {
            failureCount++;
            const errorCode = ticket.details?.error;

            if (errorCode === "DeviceNotRegistered" || errorCode === "InvalidCredentials") {
              if (targetToken) {
                staleTokens.push(targetToken);
              }
              console.warn(
                `[EXPO PUSH NOTICE] Token ${targetToken ? targetToken.substring(0, 30) + '...' : ''} rejected (${errorCode}). Device needs fresh login on the new app build.`
              );
            } else {
              console.error(
                `[EXPO PUSH ERROR] Ticket error: ${ticket.message} (details: ${JSON.stringify(ticket.details || {})})`
              );
            }
          }
        }
      } catch (error) {
        failureCount += chunk.length;
        console.error(`[EXPO PUSH ERROR] Failed to send chunk ${i + 1}/${chunks.length}:`, error.message);
      }
    }

    // Clean up stale tokens from database in background
    if (staleTokens.length > 0) {
      prisma.user.updateMany({
        where: { expoPushToken: { in: staleTokens } },
        data: { expoPushToken: null },
      }).catch((cleanErr) => {
        console.warn("[EXPO PUSH] Could not clear stale tokens:", cleanErr.message);
      });
    }

    return { successCount, failureCount };
  }
}

module.exports = new ExpoPushProvider();
