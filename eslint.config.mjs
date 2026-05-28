import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Re-engaged the three rules that were previously "off" — those silences
// let bugs accumulate (the 'not_submitted' status drift, stale closures
// from missing useEffect deps, ~200 `as any` casts hiding real type gaps).
// Set to "warn" instead of "error" so the team can address incrementally
// without breaking the build, but the warnings are visible in CI and IDE.
// Bump each to "error" once its warning count gets close to zero.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", {
        // Allow _-prefixed names to opt out (common pattern for intentionally
        // unused args, destructuring rest, etc.). Already used in the codebase
        // (see `_generateMainChartData`).
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "off", // Allow img elements
    },
  }
];

export default eslintConfig;
