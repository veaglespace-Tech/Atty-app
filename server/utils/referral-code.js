const crypto = require("crypto");

/**
 * Create a random referral code in the format: REF-XXXXXXXX
 * Uses crypto-safe random bytes for uniqueness.
 */
const createReferralCode = () =>
  `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

/**
 * Generate a unique referral code that doesn't exist in the DB.
 * @param {import("@prisma/client").PrismaClient} db - Prisma client or transaction
 * @returns {Promise<string>}
 */
const generateUniqueReferralCode = async (db) => {
  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const candidate = createReferralCode();
    const existing = await db.organization.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error("Failed to generate unique referral code");
};

module.exports = {
  createReferralCode,
  generateUniqueReferralCode,
};
