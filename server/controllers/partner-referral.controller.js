const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");

const normalizePartnerReferralCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

exports.createReferralPartner = asyncHandler(async (req, res) => {
  const { name, email, mobile, partnerReferralCode } = req.body;

  if (!name || !email) {
    res.status(400);
    throw new Error("Name and Email are required");
  }

  let code = partnerReferralCode ? normalizePartnerReferralCode(partnerReferralCode) : normalizePartnerReferralCode(`PARTNER-${Math.random().toString(36).substring(2, 8)}`);

  const exists = await prisma.referralPartner.findFirst({
    where: { OR: [{ email }, { partnerReferralCode: code }] }
  });

  if (exists) {
    res.status(400);
    throw new Error("Partner with this email or code already exists");
  }

  const partner = await prisma.referralPartner.create({
    data: { name, email, mobile, partnerReferralCode: code }
  });

  res.status(201).json({ success: true, data: partner });
});

exports.getAllReferralPartners = asyncHandler(async (req, res) => {
  const partners = await prisma.referralPartner.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { referredOrganizations: true, referredUsers: true }
      }
    }
  });
  res.status(200).json({ success: true, data: partners });
});

exports.getReferralPartnerById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const partner = await prisma.referralPartner.findUnique({
    where: { id: Number(id) },
    include: {
      referredOrganizations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, organizationCode: true, createdAt: true, subscriptionStatus: true,
          plan: { select: { name: true, price: true } },
          orgAdmin: { select: { name: true, email: true } }
        }
      },
      referredUsers: {
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, createdAt: true, role: true }
      }
    }
  });

  if (!partner) {
    res.status(404);
    throw new Error("Referral Partner not found");
  }

  res.status(200).json({ success: true, data: partner });
});

exports.updateReferralPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, email, mobile, partnerReferralCode, isActive } = req.body;

  const partner = await prisma.referralPartner.findUnique({ where: { id: Number(id) } });
  if (!partner) {
    res.status(404);
    throw new Error("Referral Partner not found");
  }

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (mobile !== undefined) updateData.mobile = mobile;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (partnerReferralCode !== undefined) updateData.partnerReferralCode = normalizePartnerReferralCode(partnerReferralCode);

  if (updateData.email || updateData.partnerReferralCode) {
    const exists = await prisma.referralPartner.findFirst({
      where: {
        id: { not: Number(id) },
        OR: [
          ...(updateData.email ? [{ email: updateData.email }] : []),
          ...(updateData.partnerReferralCode ? [{ partnerReferralCode: updateData.partnerReferralCode }] : [])
        ]
      }
    });

    if (exists) {
      res.status(400);
      throw new Error("Partner with this email or code already exists");
    }
  }

  const updatedPartner = await prisma.referralPartner.update({
    where: { id: Number(id) },
    data: updateData
  });

  res.status(200).json({ success: true, data: updatedPartner });
});

exports.deleteReferralPartner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.referralPartner.delete({ where: { id: Number(id) } });
  res.status(200).json({ success: true, message: "Partner deleted" });
});

exports.getPublicPartnerStats = asyncHandler(async (req, res) => {
  const { email, partnerReferralCode } = req.body;

  if (!email || !partnerReferralCode) {
    res.status(400);
    throw new Error("Email and Referral Code are required.");
  }

  const partner = await prisma.referralPartner.findFirst({
    where: {
      email: email.trim(),
      partnerReferralCode: partnerReferralCode.trim().toUpperCase()
    },
    include: {
      referredOrganizations: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true, name: true, createdAt: true, subscriptionStatus: true,
          plan: { select: { name: true, price: true } },
          orgAdmin: { select: { name: true, email: true } }
        }
      },
      _count: {
        select: { referredOrganizations: true, referredUsers: true }
      }
    }
  });

  if (!partner) {
    res.status(404);
    throw new Error("Invalid email or referral code.");
  }

  if (!partner.isActive) {
    res.status(403);
    throw new Error("This referral partner account is inactive.");
  }

  res.status(200).json({
    success: true,
    data: {
      ...partner,
      _config: {
        referralLinkBase: process.env.PARTNER_REFERRAL_LINK_BASE || null
      }
    }
  });
});
