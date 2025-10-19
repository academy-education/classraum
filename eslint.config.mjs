import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Allow any type for now
      "@typescript-eslint/no-unused-vars": "off", // Allow unused vars for now
      "react-hooks/exhaustive-deps": "off", // Allow missing dependencies for now
      "@next/next/no-img-element": "off", // Allow img elements
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off", // Don't report unused disable directives
    }
  }
];

export default eslintConfig;
