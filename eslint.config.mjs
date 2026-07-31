import { defineConfig, globalIgnores } from "eslint/config";
import playwright from "eslint-plugin-playwright";
import sharedRules from "@govuk-one-login/ipv-trust-and-reuse-eslint-rules";

const playwrightRecommended = playwright.configs["flat/recommended"];

// Advises without failing the build.
const advisoryRules = Object.fromEntries(
  Object.entries(playwrightRecommended.rules ?? {}).map(([rule, level]) => [rule, level === "off" ? "off" : "warn"])
);

export default defineConfig(
  globalIgnores([".aws-sam/", "coverage/", "test-reports/"]),
  sharedRules,
  {
    ...playwrightRecommended,
    files: ["tests/acceptance/browser/**/*.ts"],
    rules: advisoryRules,
  },
  {
    files: ["tests/acceptance/browser/support/global-setup.ts"],
    rules: { "no-console": "off" },
  }
);
