const { verifyToken } = require("./token.middleware");
const { allowRoles } = require("./rbac.middleware");
const { checkActiveSubscription } = require("./subscription.middleware");

const userProtected = verifyToken;

const adminProtected = [
  verifyToken,
  allowRoles("SUPER_ADMIN", "ORG_ADMIN", "SUB_ADMIN"),
];

const checkSubscription = checkActiveSubscription;

module.exports = {
  userProtected,
  adminProtected,
  checkSubscription,
  verifyToken,
};