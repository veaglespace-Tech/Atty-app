"use client";

export const autofillGuardFieldProps = {
  autoComplete: "off",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
};

export const autofillGuardEmailProps = {
  ...autofillGuardFieldProps,
  inputMode: "email",
  autoCapitalize: "none",
  spellCheck: false,
};

export const autofillGuardPasswordProps = {
  autoComplete: "new-password",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
};

export function AuthAutofillTrap() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0"
    >
      <input type="text" name="username" autoComplete="username" tabIndex={-1} />
      <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
    </div>
  );
}
