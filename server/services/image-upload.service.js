const ImageKit = require("imagekit");
const { v2: cloudinary } = require("cloudinary");
const fs = require("fs");
const path = require("path");

const SUPPORTED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=\s]+)$/;

let imageKitInstance = null;
let cloudinaryConfigured = false;

const createImageUploadError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const hasImageKitConfig = () => {
  const publicKey = String(process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  const urlEndpoint = String(process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  return Boolean(publicKey && privateKey && urlEndpoint);
};

const ensureImageKitConfigured = ({
  missingConfigMessage = "Image uploads are not configured on the server.",
  errorFactory = createImageUploadError,
} = {}) => {
  if (!hasImageKitConfig()) {
    throw errorFactory(missingConfigMessage, 503);
  }

  if (!imageKitInstance) {
    imageKitInstance = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  }
};

const hasCloudinaryConfig = () => {
  const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
  const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
  const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
  const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

  return Boolean(cloudinaryUrl) || Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);
};

const ensureCloudinaryConfigured = () => {
  if (!hasCloudinaryConfig()) return;

  if (!cloudinaryConfigured) {
    const cloudinaryUrl = String(process.env.CLOUDINARY_URL || "").trim();
    const cloudinaryCloudName = String(process.env.CLOUDINARY_CLOUD_NAME || "").trim();
    const cloudinaryApiKey = String(process.env.CLOUDINARY_API_KEY || "").trim();
    const cloudinaryApiSecret = String(process.env.CLOUDINARY_API_SECRET || "").trim();

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

const mapCloudinaryToImageKitTransform = (trans) => {
  if (!trans || !Array.isArray(trans)) return [];
  return trans.map((t) => {
    const mapped = {};
    if (t.width) mapped.width = String(t.width);
    if (t.height) mapped.height = String(t.height);
    if (t.gravity === "face") mapped.focus = "face";
    if (t.crop === "fill") mapped.cropMode = "extract";
    return mapped;
  });
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
  try {
    ensureImageKitConfigured({
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
    const fileName = publicId ? `${publicId}.jpg` : `img-${Date.now()}.jpg`;
    
    // ImageKit expects folder names to start with a slash, e.g., "/profile-images"
    const normalizedFolder = folder && !folder.startsWith("/") ? `/${folder}` : folder;

    const result = await imageKitInstance.upload({
      file: normalizedDataUrl,
      fileName,
      folder: normalizedFolder,
      useUniqueFileName: false,
    });

    let finalUrl = result.url;
    if (transformation && Array.isArray(transformation)) {
      finalUrl = imageKitInstance.url({
        path: result.filePath,
        transformation: mapCloudinaryToImageKitTransform(transformation),
      });
    }

    return {
      url: finalUrl || null,
      publicId: result.fileId || null,
    };
  } catch (error) {
    console.warn("ImageKit upload failed, falling back to local storage:", error?.message);
    
    try {
      const fileName = publicId ? `${publicId}.jpg` : `img-${Date.now()}.jpg`;
      const normalizedFolder = folder ? folder.replace(/^\//, "") : "misc";
      const uploadsDir = path.join(__dirname, "../uploads", normalizedFolder);
      
      fs.mkdirSync(uploadsDir, { recursive: true });
      
      const parsedData = parseImageDataUrl({
        value: dataUrl,
        maxBytes,
        invalidMessage,
        unsupportedMessage,
        emptyMessage,
        tooLargeMessage,
        errorFactory,
      });
      
      const base64Data = parsedData.dataUrl.split(",")[1];
      const buffer = Buffer.from(base64Data, "base64");
      
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      const backendUrl = process.env.API_URL || "http://localhost:5000";
      return {
        url: `${backendUrl}/uploads/${normalizedFolder}/${fileName}`,
        publicId: `local-${normalizedFolder}-${fileName}`,
      };
    } catch (localError) {
      throw errorFactory(localError?.message || uploadFailureMessage, 502);
    }
  }
};

const deleteImage = async (publicId) => {
  const normalizedPublicId = String(publicId || "").trim();
  if (!normalizedPublicId) return;

  if (normalizedPublicId.startsWith("local-")) {
    try {
      const parts = normalizedPublicId.split("-");
      const folder = parts[1] || "misc";
      const fileName = parts.slice(2).join("-");
      const filePath = path.join(__dirname, "../uploads", folder, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error("Failed to delete local image:", error?.message || error);
    }
    return;
  }

  // Detect if it is a Cloudinary publicId (which contains folders/slashes, e.g., "veagle-attendee/...")
  const isCloudinary = normalizedPublicId.includes("/");

  if (isCloudinary) {
    if (!hasCloudinaryConfig()) {
      console.warn(`Cannot delete legacy Cloudinary image ${normalizedPublicId}: Cloudinary config is missing.`);
      return;
    }
    ensureCloudinaryConfigured();
    try {
      await cloudinary.uploader.destroy(normalizedPublicId, {
        resource_type: "image",
        invalidate: true,
      });
    } catch (error) {
      console.error("Failed to delete legacy image from Cloudinary:", error?.message || error);
    }
  } else {
    if (!hasImageKitConfig()) {
       console.warn(`Cannot delete ImageKit image ${normalizedPublicId}: ImageKit config is missing.`);
       return;
    }
    ensureImageKitConfigured();
    try {
      await imageKitInstance.deleteFile(normalizedPublicId);
    } catch (error) {
      console.error("Failed to delete image from ImageKit:", error?.message || error);
    }
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
  ensureImageKitConfigured({
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
    const fileName = publicId ? `${publicId}` : `file-${Date.now()}`;
    const normalizedFolder = folder && !folder.startsWith("/") ? `/${folder}` : folder;

    const result = await imageKitInstance.upload({
      file: parsed.dataUrl,
      fileName,
      folder: normalizedFolder,
      useUniqueFileName: false,
    });

    return {
      url: result.url || null,
      publicId: result.fileId || null,
      format: result.format || parsed.mimeType,
      resourceType: result.fileType || "auto",
    };
  } catch (error) {
    throw errorFactory(error?.message || uploadFailureMessage, 502);
  }
};

const deleteFile = async (publicId, resourceType = "auto") => {
  const normalizedPublicId = String(publicId || "").trim();
  if (!normalizedPublicId) return;

  const isCloudinary = normalizedPublicId.includes("/");

  if (isCloudinary) {
    if (!hasCloudinaryConfig()) {
      console.warn(`Cannot delete legacy Cloudinary file ${normalizedPublicId}: Cloudinary config is missing.`);
      return;
    }
    ensureCloudinaryConfigured();
    try {
      await cloudinary.uploader.destroy(normalizedPublicId, {
        resource_type: resourceType,
        invalidate: true,
      });
    } catch (error) {
      console.error("Failed to delete legacy file from Cloudinary:", error?.message || error);
    }
  } else {
    ensureImageKitConfigured();
    try {
      await imageKitInstance.deleteFile(normalizedPublicId);
    } catch (error) {
      console.error("Failed to delete file from ImageKit:", error?.message || error);
    }
  }
};

module.exports = {
  createImageUploadError,
  uploadImageDataUrl,
  deleteCloudinaryImage: deleteImage, // Aliased for backward compatibility
  deleteImage,
  uploadFileDataUrl,
  deleteCloudinaryFile: deleteFile, // Aliased for backward compatibility
  deleteFile,
};
