import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // FIX: test files were producing massive false ESLint failures because Jest globals
  // (describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach, jest)
  // were not defined. Scoped to test files only so globals don't leak into src.
  {
    files: ["**/*.test.{js,mjs,cjs}", "**/*.spec.{js,mjs,cjs}", "**/tests/**/*.{js,mjs,cjs}", "**/__tests__/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
    },
  },
]);