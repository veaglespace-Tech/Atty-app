const { v2: cloudinary } = require("cloudinary");

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/;

let cloudinaryConfigured = false;

const createImageUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const hasCloudinaryConfig = () => {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
  const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  return Boolean(cloudinaryUrl) || Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);
};

const ensureCloudinaryConfigured = ({
  missingConfigMessage = "Image uploads are not configured on the server.",
  errorFactory = createImageUploadError,
} = {}) => {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
  const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();
  const hasExplicitConfig =
    Boolean(cloudinaryCloudName) && Boolean(cloudinaryApiKey) && Boolean(cloudinaryApiSecret);

  if (!cloudinaryUrl && !hasExplicitConfig) {
    throw errorFactory(missingConfigMessage, 503);
  }

  if (!cloudinaryConfigured) {
    cloudinary.config({
      ...(cloudinaryUrl
        ? { cloudinary_url: cloudinaryUrl }
        : {
            cloud_name: cloudinaryCloudName,
            api_key: cloudinaryApiKey,
            api_secret: cloudinaryApiSecret,
          }),
      secure: true,
    });
    cloudinaryConfigured = true;
  }
};

const parseImageDataUrl = ({
  value,
  maxBytes,
  invalidMessage = "Upload a valid image.",
  unsupportedMessage = "Only JPG, PNG, WEBP, or GIF images are supported.",
  emptyMessage = "Selected image is empty.",
  tooLargeMessage = "Selected image is too large.",
  errorFactory = createImageUploadError,
}) => {
  const normalizedValue = String(value || "").trim();
  const match = normalizedValue.match(DATA_URL_PATTERN);

  if (!match) {
    throw errorFactory(invalidMessage, 400);
  }

  const [, mimeType, base64Data] = match;
  if (!SUPPORTED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw errorFactory(unsupportedMessage, 400);
  }

  const normalizedBase64 = base64Data.replace(/\s+/g, "");
  const buffer = Buffer.from(normalizedBase64, "base64");

  if (!buffer.length) {
    throw errorFactory(emptyMessage, 400);
  }

  if (Number.isFinite(maxBytes) && maxBytes > 0 && buffer.length > maxBytes) {
    throw errorFactory(tooLargeMessage, 400);
  }

  return {
    mimeType,
    dataUrl: `data:${mimeType};base64,${normalizedBase64}`,
  };
};

const uploadImageDataUrl = async ({
  dataUrl,
  folder,
  publicId,
  maxBytes,
  transformation,
  missingConfigMessage,
  invalidMessage,
  unsupportedMessage,
  emptyMessage,
  tooLargeMessage,
  uploadFailureMessage = "Failed to upload image.",
  errorFactory = createImageUploadError,
}) => {
  ensureCloudinaryConfigured({
    missingConfigMessage,
    errorFactory,
  });

  const normalizedDataUrl = parseImageDataUrl({
    value: dataUrl,
    maxBytes,
    invalidMessage,
    unsupportedMessage,
    emptyMessage,
    tooLargeMessage,
    errorFactory,
  }).dataUrl;

  try {
    const result = await cloudinary.uploader.upload(normalizedDataUrl, {
      folder,
      public_id: publicId,
      resource_type: "image",
      overwrite: true,
      invalidate: true,
      transformation,
    });

    return {
      url: result.secure_url || result.url || null,
      publicId: result.public_id || null,
    };
  } catch (error) {
    throw errorFactory(error?.message || uploadFailureMessage, 502);
  }
};

const deleteCloudinaryImage = async (publicId) => {
  const normalizedPublicId = String(publicId || "").trim();
  if (!normalizedPublicId || !hasCloudinaryConfig()) return;

  ensureCloudinaryConfigured();

  try {
    await cloudinary.uploader.destroy(normalizedPublicId, {
      resource_type: "image",
      invalidate: true,
    });
  } catch (error) {
    console.error("Failed to delete image from Cloudinary:", error?.message || error);
  }
};

const parseFileDataUrl = ({
  value,
  maxBytes,
  invalidMessage = "Upload a valid file.",
  emptyMessage = "Selected file is empty.",
  tooLargeMessage = "Selected file is too large.",
  errorFactory = createImageUploadError,
}) => {
  const normalizedValue = String(value || "").trim();
  const match = normalizedValue.match(/^data:([a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/);

  if (!match) {
    throw errorFactory(invalidMessage, 400);
  }

  const [, mimeType, base64Data] = match;
  const normalizedBase64 = base64Data.replace(/\s+/g, "");
  const buffer = Buffer.from(normalizedBase64, "base64");

  if (!buffer.length) {
    throw errorFactory(emptyMessage, 400);
  }

  if (Number.isFinite(maxBytes) && maxBytes > 0 && buffer.length > maxBytes) {
    throw errorFactory(tooLargeMessage, 400);
  }

  return {
    mimeType,
    dataUrl: `data:${mimeType};base64,${normalizedBase64}`,
  };
};

const uploadFileDataUrl = async ({
  dataUrl,
  folder,
  publicId,
  maxBytes,
  missingConfigMessage,
  invalidMessage,
  emptyMessage,
  tooLargeMessage,
  uploadFailureMessage = "Failed to upload file.",
  errorFactory = createImageUploadError,
}) => {
  ensureCloudinaryConfigured({
    missingConfigMessage,
    errorFactory,
  });

  const parsed = parseFileDataUrl({
    value: dataUrl,
    maxBytes,
    invalidMessage,
    emptyMessage,
    tooLargeMessage,
    errorFactory,
  });

  try {
    const result = await cloudinary.uploader.upload(parsed.dataUrl, {
      folder,
      public_id: publicId,
      resource_type: "auto",
      overwrite: true,
      invalidate: true,
    });

    return {
      url: result.secure_url || result.url || null,
      publicId: result.public_id || null,
      format: result.format || parsed.mimeType,
      resourceType: result.resource_type,
    };
  } catch (error) {
    throw errorFactory(error?.message || uploadFailureMessage, 502);
  }
};

const deleteCloudinaryFile = async (publicId, resourceType = "auto") => {
  const normalizedPublicId = String(publicId || "").trim();
  if (!normalizedPublicId || !hasCloudinaryConfig()) return;

  ensureCloudinaryConfigured();

  try {
    await cloudinary.uploader.destroy(normalizedPublicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.error("Failed to delete file from Cloudinary:", error?.message || error);
  }
};

module.exports = {
  createImageUploadError,
  uploadImageDataUrl,
  deleteCloudinaryImage,
  uploadFileDataUrl,
  deleteCloudinaryFile,
};
