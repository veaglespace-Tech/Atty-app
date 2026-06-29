const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

const normalizePartnerReferralCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

// Toggle Partner Status (Super Admin Only)
exports.toggleReferralPartner = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { isPartner } = req.body;

  const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  let partnerReferralCode = user.partnerReferralCode;
  
  // Generate a code if they are becoming a partner and don't have one
  if (isPartner && !partnerReferralCode) {
    partnerReferralCode = normalizePartnerReferralCode(
      `PARTNER-${Math.random().toString(36).substring(2, 8)}`
    );
  } else if (partnerReferralCode) {
    partnerReferralCode = normalizePartnerReferralCode(partnerReferralCode);
  }

  const updatedUser = await prisma.user.update({
    where: { id: Number(userId) },
    data: {
      isReferralPartner: isPartner,
      partnerReferralCode: partnerReferralCode,
    },
    select: {
      id: true,
      name: true,
      email: true,
      isReferralPartner: true,
      partnerReferralCode: true,
    }
  });

  res.status(200).json({
    success: true,
    message: `User is ${isPartner ? 'now' : 'no longer'} a referral partner.`,
    data: updatedUser
  });
});

// Get Partner Stats (For the logged-in Partner)
exports.getPartnerStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const user = await prisma.user.findUnique({
    where: { id: Number(userId) },
    include: {
      referredOrganizations: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          organizationCode: true,
          createdAt: true,
          subscriptionStatus: true,
          plan: { select: { name: true } },
          orgAdmin: { select: { name: true, email: true } }
        }
      }
    }
  });

  if (!user || !user.isReferralPartner) {
    res.status(403);
    throw new Error("You are not authorized as a referral partner");
  }

  res.status(200).json({
    success: true,
    data: {
      referralCode: user.partnerReferralCode,
      totalReferred: user.referredOrganizations.length,
      referredOrganizations: user.referredOrganizations
    }
  });
});
