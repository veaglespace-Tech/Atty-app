const {
  notificationService,
  notifyPost,
  notifyRequest,
  notifyAlert,
  sendPushToUsers,
} = require("./notifications");

/**
 * Backward compatible export for notifyNewPost
 */
const notifyNewPost = async (post, authorId, orgId, teamId = null) => {
  return notifyPost({ post, authorId, orgId, teamId });
};

module.exports = {
  notifyNewPost,
  notifyPost,
  notifyRequest,
  notifyAlert,
  sendPushToUsers,
  notificationService,
};

