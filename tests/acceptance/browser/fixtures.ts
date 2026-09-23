import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { test as base } from "@playwright/test";
import { ConfirmDetailsPage } from "./pages/confirm-details.page.js";
import { IdentityResponsePage } from "./pages/identity-response.page.js";
import { OrchestrationStubPage } from "./pages/orchestration-stub.page.js";
import { UnrecoverableErrorPage } from "./pages/unrecoverable-error.page.js";

const HAR_FILENAME = "network.har";

type ReuseJourneyPages = {
  orchestrationStub: OrchestrationStubPage;
  confirmDetails: ConfirmDetailsPage;
  unrecoverableError: UnrecoverableErrorPage;
  identityResponse: IdentityResponsePage;
};

export const test = base.extend<ReuseJourneyPages>({
  contextOptions: async ({ contextOptions }, use, testInfo) => {
    const harPath = testInfo.outputPath(HAR_FILENAME);

    await use({ ...contextOptions, recordHar: { path: harPath, content: "embed" } });

    if (!existsSync(harPath)) {
      return;
    }
    if (testInfo.status === testInfo.expectedStatus) {
      await rm(harPath, { force: true });
      return;
    }
    await testInfo.attach(HAR_FILENAME, { path: harPath, contentType: "application/json" });
  },

  orchestrationStub: async ({ page }, use) => {
    await use(new OrchestrationStubPage(page));
  },

  confirmDetails: async ({ page }, use) => {
    await use(new ConfirmDetailsPage(page));
  },

  unrecoverableError: async ({ page }, use) => {
    await use(new UnrecoverableErrorPage(page));
  },

  identityResponse: async ({ page }, use) => {
    await use(new IdentityResponsePage(page));
  },
});

export { expect } from "@playwright/test";
