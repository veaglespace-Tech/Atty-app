const { getFirebaseAdmin, isFirebaseConfigured } = require("../firebase.config");

class FirebasePushProvider {
  isConfigured() {
    return isFirebaseConfigured();
  }

  isNativeFcmToken(token) {
    if (!token || typeof token !== "string") return false;
    // Expo tokens start with ExponentPushToken[...] or ExpoPushToken[...]
    if (token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")) {
      return false;
    }
    return token.length > 20;
  }

  buildMulticastMessage({ tokens, title, body, data = {}, imageUrl = null, sound = "default", channelId = "default" }) {
    // Firebase Cloud Messaging data fields must all be strings
    const stringData = {};
    for (const [key, value] of Object.entries(data || {})) {
      stringData[key] = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
    }
    if (imageUrl) {
      stringData.imageUrl = imageUrl;
    }

    return {
      tokens,
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound,
          channelId,
          ...(imageUrl ? { imageUrl } : {}),
        },
      },
      apns: {
        payload: {
          aps: {
            sound,
            mutableContent: Boolean(imageUrl),
          },
        },
        ...(imageUrl ? { fcmOptions: { imageUrl } } : {}),
      },
    };
  }

  async sendMulticast({ tokens, title, body, data = {}, imageUrl = null, sound = "default", channelId = "default" }) {
    if (!this.isConfigured()) {
      console.warn("[FIREBASE PUSH] Firebase is not configured with service account credentials. Skipping FCM direct push.");
      return { successCount: 0, failureCount: tokens.length };
    }

    if (!tokens || tokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const admin = getFirebaseAdmin();
    if (!admin) {
      return { successCount: 0, failureCount: tokens.length };
    }

    // FCM sendEachForMulticast accepts up to 500 tokens per batch
    const batchSize = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += batchSize) {
      const tokenBatch = tokens.slice(i, i + batchSize);
      const message = this.buildMulticastMessage({
        tokens: tokenBatch,
        title,
        body,
        data,
        imageUrl,
        sound,
        channelId,
      });

      try {
        const response = await admin.messaging().sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              console.error(`[FIREBASE PUSH ERROR] Token ${tokenBatch[idx]}:`, resp.error?.message);
            }
          });
        }
      } catch (err) {
        totalFailure += tokenBatch.length;
        console.error("[FIREBASE PUSH ERROR] Multicast batch failed:", err.message);
      }
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
  }
}

module.exports = new FirebasePushProvider();
