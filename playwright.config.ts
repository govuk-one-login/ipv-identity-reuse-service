import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import { SHARED_DEV_STUB } from "./tests/acceptance/browser/support/environment.js";

const isCI = !!process.env.CI;
const testBaseDirectory = process.env.TEST_SRC_DIR || "./tests/acceptance";
const testReportDirectory = process.env.TEST_REPORT_ABSOLUTE_DIR || "./tests-reports";

const reporters: ReporterDescription[] = [
  ["list"],
  ["html", { outputFolder: `${testReportDirectory}/playwright-report`, open: "never" }],
];

if (isCI) {
  reporters.push(["github"]);
}

export default defineConfig({
  testDir: `${testBaseDirectory}/browser`,
  outputDir: `${testReportDirectory}/playwright-artifacts`,
  globalSetup: `${testBaseDirectory}/browser/support/global-setup.ts`,

  fullyParallel: true,
  workers: "50%",
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,

  expect: { timeout: 15_000 },

  reporter: reporters,

  use: {
    baseURL: SHARED_DEV_STUB,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
