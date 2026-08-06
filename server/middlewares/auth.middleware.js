const { optionalToken, verifyToken } = require("./token.middleware");
const { checkActiveSubscription } = require("./subscription.middleware");
const { roleRateLimiter } = require("../config/rateLimit");

const userProtected = [verifyToken, roleRateLimiter];


const checkSubscription = checkActiveSubscription;

module.exports = {
  userProtected,
  checkSubscription,
  optionalToken,
  verifyToken,
};
