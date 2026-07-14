const asyncHandler = require("express-async-handler");
const prisma = require("../lib/prisma");
const { ensureOrganizationId } = require("../services/common.service");
const {
  uploadOrgLogo,
  deleteOrgLogo,
} = require("../services/org-logo.service");

exports.updateOrgLogo = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);

  const { logoDataUrl, removeLogo } = req.body;

  if (!logoDataUrl && !removeLogo) {
    res.status(400);
    throw new Error("No logo update parameters provided.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    res.status(404);
    throw new Error("Organization not found.");
  }

  let nextLogoUrl = organization.logoUrl;
  let nextLogoPublicId = organization.logoPublicId;
  let message = "";

  if (logoDataUrl) {
    if (organization.logoPublicId) {
      try {
        await deleteOrgLogo(organization.logoPublicId);
      } catch (err) {
        console.error("Failed to delete old org logo:", err);
      }
    }

    const uploaded = await uploadOrgLogo({ orgId, dataUrl: logoDataUrl });
    nextLogoUrl = uploaded.url;
    nextLogoPublicId = uploaded.publicId;
    message = "Organization logo updated successfully.";
  } else if (removeLogo) {
    if (organization.logoPublicId) {
      try {
        await deleteOrgLogo(organization.logoPublicId);
      } catch (err) {
        console.error("Failed to delete org logo:", err);
      }
    }
    nextLogoUrl = null;
    nextLogoPublicId = null;
    message = "Organization logo removed successfully.";
  }

  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: {
      logoUrl: nextLogoUrl,
      logoPublicId: nextLogoPublicId,
    },
  });

  res.status(200).json({
    success: true,
    message,
    data: {
      logoUrl: updatedOrg.logoUrl,
    },
  });
});

exports.updateOrgDetails = asyncHandler(async (req, res) => {
  const orgId = ensureOrganizationId(req, res);
  const { name, email, phone, phoneCountryCode, address, city, state, country } = req.body;

  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    res.status(404);
    throw new Error("Organization not found.");
  }

  // Ensure email uniqueness if email is being updated
  if (email && email !== organization.email) {
    const existingOrgWithEmail = await prisma.organization.findUnique({
      where: { email },
    });
    if (existingOrgWithEmail) {
      res.status(400);
      throw new Error("This email is already in use by another organization.");
    }
  }

  const updatedOrg = await prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(phoneCountryCode !== undefined && { phoneCountryCode }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(country && { country }),
    },
  });

  res.status(200).json({
    success: true,
    message: "Organization details updated successfully.",
    data: updatedOrg,
  });
});
