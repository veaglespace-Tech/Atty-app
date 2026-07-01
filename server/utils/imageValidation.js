/**
 * @file imageValidation.js
 * @description Image validation and sanitisation utilities for uploads.
 */

const path = require("path");
const crypto = require("crypto");
const { ValidationError } = require("../helpers/AppError");

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
]);

/**
 * Validate file mime type and size.
 * @param {string} mimeType - The mime type of the file
 * @param {number} size - The size of the file in bytes
 * @param {number} maxSizeBytes - The maximum allowed size in bytes
 * @throws {ValidationError} If validation fails
 */
const validateImage = (mimeType, size, maxSizeBytes) => {
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
    throw new ValidationError(
      `Unsupported file type: ${mimeType || "unknown"}. Only JPEG, PNG, WEBP, and JPG are allowed.`
    );
  }

  if (size <= 0) {
    throw new ValidationError("Selected image file is empty.");
  }

  if (maxSizeBytes && size > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new ValidationError(`Image size exceeds the allowed limit of ${sizeMb} MB.`);
  }
};

/**
 * Sanitize a filename to remove any path traversal characters and special characters.
 * @param {string} originalName - The original name of the file
 * @returns {string} Sanitized name
 */
const sanitizeFilename = (originalName) => {
  if (!originalName || typeof originalName !== "string") {
    return "unnamed";
  }
  
  // Strip paths
  const baseName = path.basename(originalName);
  
  // Remove special characters, keeping alphanumeric, hyphens, and underscores
  const cleanName = baseName
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_{2,}/g, "_"); // Collapsing consecutive underscores
    
  return cleanName;
};

/**
 * Generate a cryptographically secure UUID filename keeping the original extension.
 * @param {string} originalName - The original filename
 * @returns {string} UUID filename with extension
 */
const generateUuidFilename = (originalName) => {
  const extension = path.extname(originalName || "").toLowerCase();
  const uuid = crypto.randomUUID();
  const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(extension) ? extension : ".jpg";
  return `${uuid}${safeExt}`;
};

module.exports = {
  validateImage,
  sanitizeFilename,
  generateUuidFilename,
  ALLOWED_MIME_TYPES,
};
