const prisma = require("../../lib/prisma");
const { truncateText, extractImageUrl } = require("../common.service");
const expoProvider = require("./providers/expo.provider");
const firebaseProvider = require("./providers/firebase.provider");

class NotificationService {
  /**
   * Universal push dispatcher: queries user tokens, sorts them into Expo vs native FCM,
   * and dispatches them in the background.
   */
  async sendPushToUsers({
    userIds = null,
    orgId = null,
    teamId = null,
    excludeUserIds = [],
    title,
    body,
    data = {},
    imageUrl = null,
    sound = "default",
    channelId = "default",
    priority = "high",
  }) {
    if (!title && !body) {
      console.warn("[NOTIFICATION SERVICE] Skipping notification with empty title and body");
      return;
    }

    try {
      const parsedOrgId = orgId ? Number(orgId) : null;
      const parsedTeamId = teamId ? Number(teamId) : null;
      const excludeIds = Array.isArray(excludeUserIds)
        ? excludeUserIds.map((id) => Number(id)).filter(Boolean)
        : excludeUserIds
        ? [Number(excludeUserIds)]
        : [];

      // Build User Query Filters
      const whereClause = {
        expoPushToken: { not: null },
        deletedAt: null,
        isActive: true,
      };

      if (excludeIds.length > 0) {
        whereClause.id = { notIn: excludeIds };
      }

      if (Array.isArray(userIds) && userIds.length > 0) {
        whereClause.id = {
          in: userIds.map((id) => Number(id)).filter(Boolean),
          ...(whereClause.id ? { notIn: excludeIds } : {}),
        };
      }

      if (parsedOrgId) {
        whereClause.OR = [
          { orgId: parsedOrgId },
          { memberships: { some: { orgId: parsedOrgId, isActive: true } } },
        ];
      }

      if (parsedTeamId) {
        whereClause.teamMemberships = { some: { teamId: parsedTeamId } };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true, expoPushToken: true },
      });

      if (!users || users.length === 0) {
        console.log(`[NOTIFICATION SERVICE] No target users found with push tokens for notification: "${title}"`);
        return;
      }

      console.log(`[NOTIFICATION SERVICE] Dispatching "${title}" to ${users.length} target users`);

      // Segregate tokens into Expo vs Native Firebase FCM
      const expoMessages = [];
      const nativeFcmTokens = [];

      for (const user of users) {
        const token = String(user.expoPushToken || "").trim();
        if (!token) continue;

        if (expoProvider.isExpoToken(token)) {
          expoMessages.push(
            expoProvider.buildMessage({
              token,
              title,
              body,
              data: { ...data, userId: user.id },
              imageUrl,
              sound,
              channelId,
              priority,
            })
          );
        } else if (firebaseProvider.isNativeFcmToken(token)) {
          nativeFcmTokens.push(token);
        } else {
          // Fallback: If token format is unknown, try Expo if configured, else Firebase
          expoMessages.push(
            expoProvider.buildMessage({
              token,
              title,
              body,
              data: { ...data, userId: user.id },
              imageUrl,
              sound,
              channelId,
              priority,
            })
          );
        }
      }

      // Fire and forget in background so API remains fast
      (async () => {
        if (expoMessages.length > 0) {
          console.log(`[NOTIFICATION SERVICE] Sending ${expoMessages.length} push notifications via Expo...`);
          await expoProvider.sendMessages(expoMessages);
        }

        if (nativeFcmTokens.length > 0) {
          console.log(`[NOTIFICATION SERVICE] Sending ${nativeFcmTokens.length} push notifications via Firebase FCM...`);
          await firebaseProvider.sendMulticast({
            tokens: nativeFcmTokens,
            title,
            body,
            data,
            imageUrl,
            sound,
            channelId,
          });
        }
      })().catch((bgError) => {
        console.error("[NOTIFICATION SERVICE ERROR] Background push dispatch failed:", bgError);
      });
    } catch (err) {
      console.error("[NOTIFICATION SERVICE ERROR] Failed to query users or prepare push notifications:", err);
    }
  }

  /**
   * Helper 1: Notify users when a new post / announcement is published
   */
  async notifyPost({ post, authorId, orgId, teamId = null }) {
    if (!post) return;

    const formatPostType = (type) => {
      if (!type) return "Post";
      return type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    const title = post.type ? `New ${formatPostType(post.type)}: ${post.title}` : `New Post: ${post.title}`;
    const body = truncateText(post.content || post.title, 120);
    const imageUrl = extractImageUrl(post);

    await this.sendPushToUsers({
      orgId: orgId || post.orgId,
      teamId: teamId || post.teamId,
      excludeUserIds: authorId ? [authorId] : [],
      title,
      body,
      imageUrl,
      data: {
        eventType: "NEW_POST",
        postId: post.id,
        title: post.title,
        type: post.type,
      },
    });
  }

  /**
   * Helper 2: Notify managers / admins / specific users when a request is submitted
   * (e.g. Regularization, Leave, Expense claim)
   */
  async notifyRequest({
    type = "REQUEST",
    title,
    message,
    requester = null,
    targetUserIds = [],
    orgId = null,
    data = {},
  }) {
    const requesterName = requester?.name || requester?.email || "A user";
    const notificationTitle = title || `New ${type} Request`;
    const notificationBody = message || `${requesterName} submitted a new ${type.toLowerCase()} request.`;

    await this.sendPushToUsers({
      userIds: targetUserIds,
      orgId,
      excludeUserIds: requester?.id ? [requester.id] : [],
      title: notificationTitle,
      body: notificationBody,
      data: {
        eventType: "USER_REQUEST",
        requestType: type,
        requesterId: requester?.id,
        ...data,
      },
    });
  }

  /**
   * Helper 3: Broadcast a system alert or notification
   */
  async notifyAlert({
    title,
    message,
    userIds = null,
    orgId = null,
    imageUrl = null,
    data = {},
  }) {
    await this.sendPushToUsers({
      userIds,
      orgId,
      title,
      body: message,
      imageUrl,
      data: {
        eventType: "SYSTEM_ALERT",
        ...data,
      },
    });
  }
}

module.exports = new NotificationService();
