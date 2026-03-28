export const PHONE_DIGIT_MIN = 6;
export const PHONE_DIGIT_MAX = 15;
export const ATTENDANCE_RADIUS_MIN = 5;
export const ATTENDANCE_RADIUS_MAX = 1000;
export const PLAN_DURATION_MAX = 3650;
export const PLAN_PRICE_MAX = 10000000;
export const PLAN_LIMIT_MAX = 1000000;
export const TEXT_AREA_MAX = 500;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PERSON_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,119}$/u;
export const ORGANIZATION_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{M}\p{N}\s&().,'/-]{1,119}$/u;
export const PLACE_NAME_REGEX = /^[\p{L}][\p{L}\p{M}\s.'-]{1,79}$/u;
export const PLAN_CODE_REGEX = /^[A-Z0-9][A-Z0-9_-]{1,23}$/;

const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/;

export const normalizeTextInput = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

export const normalizeEmailInput = (value) => normalizeTextInput(value).toLowerCase();

export const toDigitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

export const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || error?.message || fallback;

export const validateRequiredText = ({
  value,
  label,
  min = 1,
  max = 120,
  pattern,
  patternMessage,
}) => {
  const normalized = normalizeTextInput(value);
  if (!normalized) return `${label} is required`;
  if (normalized.length < min) return `${label} must be at least ${min} characters`;
  if (normalized.length > max) return `${label} must be at most ${max} characters`;
  if (pattern && !pattern.test(normalized)) {
    return patternMessage || `Enter a valid ${label.toLowerCase()}`;
  }
  return null;
};

export const validateOptionalText = ({ value, label, max = TEXT_AREA_MAX }) => {
  const normalized = normalizeTextInput(value);
  if (!normalized) return null;
  if (normalized.length > max) return `${label} must be at most ${max} characters`;
  return null;
};

export const validateEmailInput = (value, label = "Email") => {
  const normalized = normalizeEmailInput(value);
  if (!normalized) return `${label} is required`;
  if (!EMAIL_REGEX.test(normalized)) return `Enter a valid ${label.toLowerCase()}`;
  return null;
};

export const validatePhoneInput = (
  value,
  {
    label = "Mobile number",
    required = true,
    min = PHONE_DIGIT_MIN,
    max = PHONE_DIGIT_MAX,
  } = {}
) => {
  const digits = toDigitsOnly(value);
  if (!digits) return required ? `${label} is required` : null;
  if (digits.length < min) return `${label} must be at least ${min} digits`;
  if (digits.length > max) return `${label} must be at most ${max} digits`;
  return null;
};

export const validatePasswordInput = (
  value,
  { required = true, min = 8, max = 64 } = {}
) => {
  const password = String(value ?? "");
  if (!password) return required ? "Password is required" : null;
  if (password.length < min) return `Password must be at least ${min} characters`;
  if (password.length > max) return `Password must be at most ${max} characters`;
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter";
  if (!/\d/.test(password)) return "Password must include at least one number";
  if (!PASSWORD_SPECIAL_REGEX.test(password)) {
    return "Password must include at least one special character";
  }
  return null;
};

export const validateAttendanceRadius = (value, label = "Attendance radius") => {
  const radius = Number(value);
  if (!Number.isFinite(radius)) return `${label} must be a number`;
  if (radius < ATTENDANCE_RADIUS_MIN || radius > ATTENDANCE_RADIUS_MAX) {
    return `${label} must be between ${ATTENDANCE_RADIUS_MIN} and ${ATTENDANCE_RADIUS_MAX}`;
  }
  return null;
};

export const validateCoordinatePair = ({
  longitude,
  latitude,
  required = true,
}) => {
  const lngValue = String(longitude ?? "").trim();
  const latValue = String(latitude ?? "").trim();

  if (!lngValue && !latValue) {
    return required ? "Longitude and latitude are required" : null;
  }

  if (!lngValue || !latValue) {
    return "Please enter both longitude and latitude";
  }

  const lng = Number(lngValue);
  const lat = Number(latValue);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return "Longitude and latitude must be valid numbers";
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return "Longitude or latitude is out of range";
  }

  return null;
};

export const validateDateWindow = ({ date, from, to }) => {
  if (date) return null;
  if (from && to && from > to) return "From date cannot be after To date";
  return null;
};

export const validateManagedUserForm = ({
  name,
  email,
  mobile,
  password,
  passwordRequired = false,
}) => {
  return (
    validateRequiredText({
      value: name,
      label: "Full name",
      min: 2,
      max: 120,
      pattern: PERSON_NAME_REGEX,
      patternMessage: "Full name can only include letters, spaces, apostrophes, dots, or hyphens",
    }) ||
    validateEmailInput(email) ||
    validatePhoneInput(mobile, { label: "Mobile number" }) ||
    validatePasswordInput(password, { required: passwordRequired })
  );
};

export const validateTeamForm = ({
  name,
  description,
  attendanceRadius,
  longitude,
  latitude,
  requireCoordinates = false,
}) => {
  const normalizedAttendanceRadius = String(attendanceRadius ?? "").trim();

  return (
    validateRequiredText({
      value: name,
      label: "Team name",
      min: 2,
      max: 120,
      pattern: ORGANIZATION_NAME_REGEX,
      patternMessage: "Team name can only include letters, numbers, spaces, and . & ( ) - characters",
    }) ||
    validateOptionalText({
      value: description,
      label: "Description",
      max: 191,
    }) ||
    (normalizedAttendanceRadius
      ? validateAttendanceRadius(normalizedAttendanceRadius)
      : null) ||
    validateCoordinatePair({
      longitude,
      latitude,
      required: requireCoordinates,
    })
  );
};

export const validateAttendanceSettingsForm = ({
  attendanceRadius,
  longitude,
  latitude,
}) => {
  return (
    validateAttendanceRadius(attendanceRadius) ||
    validateCoordinatePair({ longitude, latitude, required: true })
  );
};

export const validatePlanForm = ({
  name,
  code,
  price,
  durationInDays,
  memberLimit,
  maxTeams,
  maxLocations,
  description,
}) => {
  const normalizedCode = String(code ?? "").trim().toUpperCase();
  const parsedPrice = Number(price);
  const parsedDuration = Number(durationInDays);
  const parsedMemberLimit = Number(memberLimit || 0);
  const parsedMaxTeams = Number(maxTeams || 0);
  const parsedMaxLocations = Number(maxLocations || 0);

  return (
    validateRequiredText({
      value: name,
      label: "Plan name",
      min: 2,
      max: 120,
      pattern: ORGANIZATION_NAME_REGEX,
      patternMessage: "Plan name contains unsupported characters",
    }) ||
    (!normalizedCode ? "Plan code is required" : null) ||
    (!PLAN_CODE_REGEX.test(normalizedCode)
      ? "Plan code must use uppercase letters, numbers, hyphen, or underscore"
      : null) ||
    (!Number.isFinite(parsedPrice) ? "Plan price must be a valid number" : null) ||
    (parsedPrice < 0 ? "Plan price cannot be negative" : null) ||
    (parsedPrice > PLAN_PRICE_MAX ? `Plan price cannot exceed ${PLAN_PRICE_MAX}` : null) ||
    (!Number.isFinite(parsedDuration) ? "Duration must be a valid number" : null) ||
    (parsedDuration < 1 ? "Duration must be at least 1 day" : null) ||
    (parsedDuration > PLAN_DURATION_MAX
      ? `Duration cannot exceed ${PLAN_DURATION_MAX} days`
      : null) ||
    (!Number.isFinite(parsedMemberLimit) ? "Member limit must be a valid number" : null) ||
    (parsedMemberLimit < 0 ? "Member limit cannot be negative" : null) ||
    (parsedMemberLimit > PLAN_LIMIT_MAX
      ? `Member limit cannot exceed ${PLAN_LIMIT_MAX}`
      : null) ||
    (!Number.isFinite(parsedMaxTeams) ? "Max teams must be a valid number" : null) ||
    (parsedMaxTeams < 0 ? "Max teams cannot be negative" : null) ||
    (parsedMaxTeams > PLAN_LIMIT_MAX ? `Max teams cannot exceed ${PLAN_LIMIT_MAX}` : null) ||
    (!Number.isFinite(parsedMaxLocations) ? "Max locations must be a valid number" : null) ||
    (parsedMaxLocations < 0 ? "Max locations cannot be negative" : null) ||
    (parsedMaxLocations > PLAN_LIMIT_MAX
      ? `Max locations cannot exceed ${PLAN_LIMIT_MAX}`
      : null) ||
    validateOptionalText({
      value: description,
      label: "Description",
      max: TEXT_AREA_MAX,
    })
  );
};
