const COUNTRY_CODE_REGEX = /^\+?[1-9]\d{0,2}$/;

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const normalizeCountryCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (!COUNTRY_CODE_REGEX.test(raw)) {
    throw new Error("Country code must be in +<digits> format");
  }

  const digits = raw.replace(/\D/g, "");
  return `+${digits}`;
};

const normalizePhoneNumber = ({
  phone,
  countryCode,
  requireCountryCode = false,
}) => {
  const rawPhone = String(phone || "").trim();
  if (!rawPhone) {
    throw new Error("Phone number is required");
  }

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  if (requireCountryCode && !normalizedCountryCode) {
    throw new Error("Country code is required");
  }

  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (!digitsOnly) {
    throw new Error("Phone number is invalid");
  }

  const startedWithPlus = rawPhone.startsWith("+");
  let phoneE164 = "";
  let nationalNumber = digitsOnly;

  if (startedWithPlus) {
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      throw new Error("Phone number must be between 8 and 15 digits in E.164 format");
    }

    if (
      normalizedCountryCode &&
      !digitsOnly.startsWith(normalizedCountryCode.slice(1))
    ) {
      throw new Error("Phone number does not match selected country code");
    }

    phoneE164 = `+${digitsOnly}`;
    if (normalizedCountryCode) {
      nationalNumber = digitsOnly.slice(normalizedCountryCode.length - 1);
    }
  } else if (normalizedCountryCode) {
    nationalNumber = digitsOnly.replace(/^0+/, "");
    if (nationalNumber.length < 6 || nationalNumber.length > 15) {
      throw new Error("Local phone number must be between 6 and 15 digits");
    }

    const combinedDigits = `${normalizedCountryCode.slice(1)}${nationalNumber}`;
    if (combinedDigits.length > 15) {
      throw new Error("Phone number is too long for E.164 format");
    }

    phoneE164 = `+${combinedDigits}`;
  } else {
    if (digitsOnly.length < 6 || digitsOnly.length > 15) {
      throw new Error("Phone number must be between 6 and 15 digits");
    }
    phoneE164 = digitsOnly;
  }

  if (nationalNumber.length < 6 || nationalNumber.length > 15) {
    throw new Error("Local phone number must be between 6 and 15 digits");
  }

  return {
    countryCode: normalizedCountryCode,
    nationalNumber,
    e164: phoneE164,
  };
};

module.exports = {
  normalizeCountryCode,
  normalizeEmail,
  normalizePhoneNumber,
};