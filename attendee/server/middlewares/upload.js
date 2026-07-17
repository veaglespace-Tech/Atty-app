/**
 * @file upload.js
 * @description Multer configuration for secure in-memory file uploads.
 */

const multer = require("multer");
const path = require("path");
const { ValidationError } = require("../helpers/AppError");
const { ALLOWED_MIME_TYPES } = require("../utils/imageValidation");

// Use memory storage to avoid writing files to local disk
const storage = multer.memoryStorage();

/**
 * Filter files based on mimetype and extension to reject harmful formats
 */
const fileFilter = (req, file, cb) => {
  const mimeType = String(file.mimetype || "").toLowerCase();
  const extension = path.extname(file.originalname || "").toLowerCase();

  // 1. Strict MIME type validation
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return cb(
      new ValidationError(
        `Forbidden file type: ${mimeType || "unknown"}. Only JPEG, PNG, WEBP, and JPG images are allowed.`
      ),
      false
    );
  }

  // 2. Reject explicit harmful or disallowed extensions even if spoofed
  const forbiddenExtensions = [
    ".exe", ".bat", ".sh", ".cmd", ".js", ".msi", // Executables
    ".zip", ".rar", ".7z", ".tar", ".gz",         // Archive files
    ".pdf",                                       // Documents
    ".svg",                                       // SVGs (vulnerable to XSS)
  ];

  if (forbiddenExtensions.includes(extension)) {
    return cb(
      new ValidationError(`Files with extension '${extension}' are rejected for security reasons.`),
      false
    );
  }

  cb(null, true);
};

// Multer upload configurations
const multerUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Maximum limit: 10 MB (specific endpoints can validate lower limits)
  },
});

/**
 * Middleware for single file upload.
 * @param {string} fieldName - Form field name
 */
const singleUpload = (fieldName) => {
  return (req, res, next) => {
    multerUpload.single(fieldName)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new ValidationError("File size exceeds the maximum limit of 10 MB."));
        }
        return next(new ValidationError(`Multer upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

/**
 * Middleware for multiple files upload.
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Maximum number of files allowed
 */
const multipleUpload = (fieldName, maxCount = 10) => {
  return (req, res, next) => {
    multerUpload.array(fieldName, maxCount)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(new ValidationError("One or more files exceed the maximum size limit of 10 MB."));
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
          return next(new ValidationError(`Too many files. Maximum allowed limit is ${maxCount}.`));
        }
        return next(new ValidationError(`Multer upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

module.exports = {
  singleUpload,
  multipleUpload,
};
