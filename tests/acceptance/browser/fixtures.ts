import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { test as base } from "@playwright/test";
import { ConfirmDetailsPage } from "./pages/confirm-details.page";
import { IdentityResponsePage } from "./pages/identity-response.page";
import { OrchestrationStubPage } from "./pages/orchestration-stub.page";
import { UnrecoverableErrorPage } from "./pages/unrecoverable-error.page";
import { SHARED_DEV_SIS, sisBaseUrl } from "./support/environment";

const HAR_FILENAME = "network.har";

type ReuseJourneyPages = {
  orchestrationStub: OrchestrationStubPage;
  confirmDetails: ConfirmDetailsPage;
  unrecoverableError: UnrecoverableErrorPage;
  identityResponse: IdentityResponsePage;
};

export const test = base.extend<ReuseJourneyPages>({
  page: async ({ page, baseURL }, use) => {
    const sis = await sisBaseUrl();

    if (sis !== SHARED_DEV_SIS) {
      await page.route(`${baseURL}/authorize`, async (route) => {
        const response = await route.fetch({ maxRedirects: 0 });
        const headers = response.headers();
        const location = headers["location"];

        if (location?.startsWith(SHARED_DEV_SIS)) {
          const { pathname, search } = new URL(location);
          headers["location"] = `${sis}${pathname}${search}`;
        }

        await route.fulfill({ response, headers });
      });
    }

    await use(page);
  },

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
