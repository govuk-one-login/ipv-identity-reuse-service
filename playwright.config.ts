import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import { SHARED_DEV_STUB } from "./tests/acceptance/browser/support/environment";

const isCI = !!process.env.CI;

const reporters: ReporterDescription[] = [
  ["list"],
  ["html", { outputFolder: "test-reports/playwright-report", open: "never" }],
];

if (isCI) {
  reporters.push(["github"]);
}

export default defineConfig({
  testDir: "./tests/acceptance/browser",
  outputDir: "./test-reports/playwright-artifacts",
  globalSetup: "./tests/acceptance/browser/support/global-setup.ts",

  fullyParallel: true,
  workers: "50%",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,

  expect: { timeout: 7000 },

  reporter: reporters,

  use: {
    baseURL: SHARED_DEV_STUB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
