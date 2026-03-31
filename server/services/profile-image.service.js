const {
  createImageUploadError,
  uploadImageDataUrl,
  deleteCloudinaryImage,
} = require("./cloudinary-image.service");

const PROFILE_IMAGE_FOLDER = String(
  process.env.CLOUDINARY_PROFILE_IMAGE_FOLDER || "veagle-attendee/profile-images"
).trim();
const MAX_PROFILE_IMAGE_BYTES = Number(process.env.PROFILE_IMAGE_MAX_BYTES || 2 * 1024 * 1024);

const createProfileImageError = (message, statusCode = 400) =>
  createImageUploadError(message, statusCode);

const uploadProfileImage = async ({ userId, dataUrl }) => {
  const resolvedUserId = Number(userId);
  if (!Number.isFinite(resolvedUserId) || resolvedUserId <= 0) {
    throw createProfileImageError("A valid user id is required for profile image upload.", 400);
  }

  return uploadImageDataUrl({
    dataUrl,
    folder: PROFILE_IMAGE_FOLDER,
    publicId: `user-${resolvedUserId}-${Date.now()}`,
    maxBytes: MAX_PROFILE_IMAGE_BYTES,
    missingConfigMessage: "Profile image uploads are not configured on the server.",
    invalidMessage: "Upload a valid JPG, PNG, WEBP, or GIF image.",
    unsupportedMessage: "Only JPG, PNG, WEBP, or GIF profile images are supported.",
    emptyMessage: "Selected profile image is empty.",
    tooLargeMessage: "Profile image must be 2 MB or smaller.",
    uploadFailureMessage: "Failed to upload profile image. Please try again.",
    errorFactory: createProfileImageError,
    transformation: [
      {
        width: 512,
        height: 512,
        crop: "fill",
        gravity: "face",
        quality: "auto",
        fetch_format: "auto",
      },
    ],
  });
};

const deleteProfileImage = async (publicId) => deleteCloudinaryImage(publicId);

module.exports = {
  MAX_PROFILE_IMAGE_BYTES,
  createProfileImageError,
  uploadProfileImage,
  deleteProfileImage,
};
