import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.name='setInterval']",
          message:
            "Avoid polling loops in UI. Prefer event-driven updates or bounded setTimeout with cleanup.",
        },
        {
          selector: "CallExpression[callee.property.name='setInterval']",
          message:
            "Avoid polling loops in UI. Prefer event-driven updates or bounded setTimeout with cleanup.",
        },
      ],
    },
  },
]);

export default eslintConfig;
