const normalizeBase64Url = (value = "") => {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return `${normalized}${"=".repeat(paddingLength)}`;
};

export const decodePayuPayload = (encodedPayload = "") => {
  if (!encodedPayload || typeof window === "undefined") return null;

  try {
    const decodedJson = window.atob(normalizeBase64Url(encodedPayload));
    const parsed = JSON.parse(decodedJson);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const submitHostedPaymentForm = (paymentSession = {}) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Hosted checkout is only available in browser context.");
  }

  const action = String(paymentSession?.action || "").trim();
  const fields = paymentSession?.fields;

  if (!action || !fields || typeof fields !== "object") {
    throw new Error("Invalid hosted payment session received from server.");
  }

  const form = document.createElement("form");
  form.method = String(paymentSession?.method || "POST").toUpperCase();
  form.action = action;
  form.style.display = "none";

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = String(value ?? "");
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};
