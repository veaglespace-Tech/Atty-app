/**
 * @file AppError.js
 * @description Reusable custom errors for application-wide structured error handling.
 */

class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ConfigurationError extends AppError {
  constructor(message = "Service configuration is invalid or missing variables.") {
    super(message, 500);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation failed for input data.") {
    super(message, 400);
  }
}

class UploadError extends AppError {
  constructor(message = "Failed to upload image/file.") {
    super(message, 502);
  }
}

class DeleteError extends AppError {
  constructor(message = "Failed to delete image/file.") {
    super(message, 502);
  }
}

class ImageNotFoundError extends AppError {
  constructor(message = "Image not found.") {
    super(message, 404);
  }
}

class DatabaseError extends AppError {
  constructor(message = "Database operation failed.") {
    super(message, 500);
  }
}

module.exports = {
  AppError,
  ConfigurationError,
  ValidationError,
  UploadError,
  DeleteError,
  ImageNotFoundError,
  DatabaseError,
};
