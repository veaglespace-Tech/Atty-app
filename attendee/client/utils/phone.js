export const COUNTRY_PHONE_OPTIONS = [
  { label: "India", code: "+91", iso: "IN" },
  { label: "United States", code: "+1", iso: "US" },
  { label: "United Kingdom", code: "+44", iso: "GB" },
  { label: "United Arab Emirates", code: "+971", iso: "AE" },
  { label: "Canada", code: "+1", iso: "CA" },
  { label: "Australia", code: "+61", iso: "AU" },
  { label: "Singapore", code: "+65", iso: "SG" },
  { label: "Germany", code: "+49", iso: "DE" },
  { label: "France", code: "+33", iso: "FR" },
  { label: "Netherlands", code: "+31", iso: "NL" },
  { label: "Saudi Arabia", code: "+966", iso: "SA" },
  { label: "Qatar", code: "+974", iso: "QA" },
  { label: "Kuwait", code: "+965", iso: "KW" },
  { label: "Oman", code: "+968", iso: "OM" },
  { label: "Bahrain", code: "+973", iso: "BH" },
  { label: "Nepal", code: "+977", iso: "NP" },
  { label: "Bangladesh", code: "+880", iso: "BD" },
  { label: "Sri Lanka", code: "+94", iso: "LK" },
  { label: "Malaysia", code: "+60", iso: "MY" },
  { label: "South Africa", code: "+27", iso: "ZA" },
];

export const getDefaultCountryCode = (value = "+91") => {
  const normalized = String(value || "").trim();
  return COUNTRY_PHONE_OPTIONS.some((item) => item.code === normalized) ? normalized : "+91";
};

export const getLocalPhoneNumber = (phone, countryCode) => {
  const rawPhone = String(phone || "").trim();
  if (!rawPhone) return "";

  const digitsOnly = rawPhone.replace(/\D/g, "");
  const countryDigits = String(countryCode || "").replace(/\D/g, "");

  if (rawPhone.startsWith("+") && countryDigits && digitsOnly.startsWith(countryDigits)) {
    return digitsOnly.slice(countryDigits.length);
  }

  if (rawPhone.startsWith("+")) {
    return digitsOnly;
  }

  return rawPhone;
};
