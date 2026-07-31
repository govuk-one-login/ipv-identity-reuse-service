import type { Locator, Page } from "@playwright/test";

export class IdentityResponsePage {
  readonly heading: Locator;
  readonly identityJson: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Orchestration stub: Response", level: 1 });
    this.identityJson = page.locator("pre");
  }

  async readIdentity(): Promise<Record<string, unknown>> {
    const rawIdentity = await this.identityJson.textContent();
    if (!rawIdentity) {
      throw new Error("The orchestration stub rendered no identity to read");
    }
    return JSON.parse(rawIdentity);
  }
}
