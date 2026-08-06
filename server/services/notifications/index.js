const notificationService = require("./notification.service");
const firebaseConfig = require("./firebase.config");
const expoProvider = require("./providers/expo.provider");
const firebaseProvider = require("./providers/firebase.provider");

module.exports = {
  notificationService,
  sendPushToUsers: notificationService.sendPushToUsers.bind(notificationService),
  notifyPost: notificationService.notifyPost.bind(notificationService),
  notifyRequest: notificationService.notifyRequest.bind(notificationService),
  notifyAlert: notificationService.notifyAlert.bind(notificationService),
  firebaseConfig,
  expoProvider,
  firebaseProvider,
};
