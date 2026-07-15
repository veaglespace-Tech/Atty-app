const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PERSON_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,119}$/u;
const ORGANIZATION_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&().,'/-]{1,119}$/u;

const { validateEmailAdvanced } = require("./advancedEmailValidation");

const validateEmail = async (email) => {
  return await validateEmailAdvanced(email, false); // Disable DNS checks to prevent timeouts or errors in restricted environments
};

const validatePersonName = (name) => {
  if (!name || typeof name !== "string") return false;
  return PERSON_NAME_REGEX.test(name.trim());
};

const validateOrganizationName = (name) => {
  if (!name || typeof name !== "string") return false;
  return ORGANIZATION_NAME_REGEX.test(name.trim());
};

const validatePasswordComplexity = (password) => {
  if (!password || typeof password !== "string") return false;
  if (password.length < 8 || password.length > 64) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/\d/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>_]/.test(password)) return false;
  return true;
};

module.exports = {
  validateEmail,
  validatePersonName,
  validateOrganizationName,
  validatePasswordComplexity,
};
