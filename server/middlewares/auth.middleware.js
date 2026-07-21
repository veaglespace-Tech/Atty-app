const { optionalToken, verifyToken } = require("./token.middleware");
const { allowRoles } = require("./rbac.middleware");
const { checkActiveSubscription } = require("./subscription.middleware");
const { roleRateLimiter } = require("../config/rateLimit");

const userProtected = [verifyToken, roleRateLimiter];

const adminProtected = [
  verifyToken,
  allowRoles("SUPER_ADMIN", "ORG_ADMIN", "SUB_ADMIN"),
  roleRateLimiter
];

const checkSubscription = checkActiveSubscription;

module.exports = {
  userProtected,
  adminProtected,
  checkSubscription,
  optionalToken,
  verifyToken,
};
