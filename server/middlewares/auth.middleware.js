const { optionalToken, verifyToken } = require("./token.middleware");
const { checkActiveSubscription } = require("./subscription.middleware");
const { roleRateLimiter } = require("../config/rateLimit");

const userProtected = [verifyToken, roleRateLimiter];

<<<<<<< HEAD
=======

>>>>>>> a01164d8eae9ad547aa5f4852667e6e0c5bc20f1
const checkSubscription = checkActiveSubscription;

module.exports = {
  userProtected,
  checkSubscription,
  optionalToken,
  verifyToken,
};
