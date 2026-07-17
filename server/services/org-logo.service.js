const {
  createImageUploadError,
  uploadImageDataUrl,
  deleteCloudinaryImage,
} = require("./image-upload.service");

const ORG_LOGO_FOLDER = String(
  process.env.IMAGEKIT_ORG_LOGO_FOLDER || "veagle-attendee/org-logos"
).trim();
const MAX_ORG_LOGO_BYTES = Number(process.env.ORG_LOGO_MAX_BYTES || 5 * 1024 * 1024);

const createOrgLogoError = (message, statusCode = 400) =>
  createImageUploadError(message, statusCode);

const uploadOrgLogo = async ({ orgId, dataUrl }) => {
  const resolvedOrgId = Number(orgId);
  if (!Number.isFinite(resolvedOrgId) || resolvedOrgId <= 0) {
    throw createOrgLogoError("A valid organization id is required for logo upload.", 400);
  }

  return uploadImageDataUrl({
    dataUrl,
    folder: ORG_LOGO_FOLDER,
    publicId: `org-${resolvedOrgId}-logo-${Date.now()}`,
    maxBytes: MAX_ORG_LOGO_BYTES,
    missingConfigMessage: "Organization logo uploads are not configured on the server.",
    invalidMessage: "Upload a valid JPG, PNG, WEBP, or GIF image.",
    unsupportedMessage: "Only JPG, PNG, WEBP, or GIF logos are supported.",
    emptyMessage: "Selected organization logo is empty.",
    tooLargeMessage: "Organization logo must be 5 MB or smaller.",
    uploadFailureMessage: "Failed to upload organization logo. Please try again.",
    errorFactory: createOrgLogoError,
    transformation: [
      {
        width: 512,
        height: 512,
        crop: "fit",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
};

const deleteOrgLogo = async (publicId) => deleteCloudinaryImage(publicId);

module.exports = {
  MAX_ORG_LOGO_BYTES,
  createOrgLogoError,
  uploadOrgLogo,
  deleteOrgLogo,
};
