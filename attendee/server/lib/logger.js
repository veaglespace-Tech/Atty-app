/**
 * @file logger.js
 * @description Structured logging utility for the ImageKit integration.
 */

class Logger {
  static formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    // Safety check: remove any potential secrets
    const sanitizedMeta = { ...meta };
    const secretKeys = ["privateKey", "apiKey", "password", "token", "api_secret", "secret"];
    
    Object.keys(sanitizedMeta).forEach((key) => {
      if (secretKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitizedMeta[key] = "[REDACTED]";
      }
    });

    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(Object.keys(sanitizedMeta).length > 0 ? { metadata: sanitizedMeta } : {}),
    });
  }

  static info(message, meta = {}) {
    console.log(this.formatMessage("INFO", message, meta));
  }

  static warn(message, meta = {}) {
    console.warn(this.formatMessage("WARN", message, meta));
  }

  static error(message, err = null, meta = {}) {
    const errorDetails = err instanceof Error ? {
      errorMessage: err.message,
      errorStack: err.stack,
    } : { err };

    console.error(
      this.formatMessage("ERROR", message, {
        ...errorDetails,
        ...meta,
      })
    );
  }
}

module.exports = Logger;
