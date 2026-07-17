/**
 * @file imagekit.js
 * @description Singleton configuration loader for ImageKit SDK.
 */

const ImageKit = require("imagekit");
const { ConfigurationError } = require("../helpers/AppError");
const Logger = require("../lib/logger");

let imageKitInstance = null;

const initializeImageKit = () => {
  const publicKey = String(process.env.IMAGEKIT_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.IMAGEKIT_PRIVATE_KEY || "").trim();
  const urlEndpoint = String(process.env.IMAGEKIT_URL_ENDPOINT || "").trim();

  Logger.info("Validating ImageKit configuration...");

  if (!publicKey) {
    const error = new ConfigurationError("Missing IMAGEKIT_PUBLIC_KEY in environment variables.");
    Logger.error("ImageKit configuration validation failed", error);
    throw error;
  }

  if (!privateKey) {
    const error = new ConfigurationError("Missing IMAGEKIT_PRIVATE_KEY in environment variables.");
    Logger.error("ImageKit configuration validation failed", error);
    throw error;
  }

  if (!urlEndpoint) {
    const error = new ConfigurationError("Missing IMAGEKIT_URL_ENDPOINT in environment variables.");
    Logger.error("ImageKit configuration validation failed", error);
    throw error;
  }

  try {
    imageKitInstance = new ImageKit({
      publicKey,
      privateKey,
      urlEndpoint,
    });
    Logger.info("ImageKit SDK initialized successfully.");
    return imageKitInstance;
  } catch (err) {
    Logger.error("Failed to initialize ImageKit SDK instance", err);
    throw new ConfigurationError(`ImageKit SDK initialization failed: ${err.message}`);
  }
};

const getImageKit = () => {
  if (!imageKitInstance) {
    return initializeImageKit();
  }
  return imageKitInstance;
};

module.exports = {
  getImageKit,
  initializeImageKit,
};
