class Expo {
  static isExpoPushToken(token) {
    return typeof token === "string" && token.startsWith("ExponentPushToken[");
  }
  async sendPushNotificationsAsync(messages) {
    return messages.map(() => ({ status: "ok", id: "mock-ticket-id" }));
  }
  chunkPushNotifications(messages) {
    return [messages];
  }
}

module.exports = {
  Expo,
  default: Expo,
};
