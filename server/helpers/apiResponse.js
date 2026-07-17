/**
 * @file apiResponse.js
 * @description Helper functions to standardise API responses.
 */

class ApiResponse {
  /**
   * Send a success response.
   * @param {object} res - Express response object
   * @param {string} message - Response message
   * @param {object} [data={}] - Response data
   * @param {number} [statusCode=200] - HTTP status code
   */
  static success(res, message, data = {}, statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Send an error response.
   * @param {object} res - Express response object
   * @param {string} message - Error message
   * @param {object} [errors={}] - Detailed errors object
   * @param {number} [statusCode=500] - HTTP status code
   */
  static error(res, message, errors = {}, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }
}

module.exports = ApiResponse;
