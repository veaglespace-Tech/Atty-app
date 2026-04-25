const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PERSON_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,119}$/u;
const ORGANIZATION_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&().,'/-]{1,119}$/u;

const validateEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
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
