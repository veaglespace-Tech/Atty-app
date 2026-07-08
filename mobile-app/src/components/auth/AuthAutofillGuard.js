import { View } from "react-native";
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
  return <View style={{ display: 'none' }} />;
}
