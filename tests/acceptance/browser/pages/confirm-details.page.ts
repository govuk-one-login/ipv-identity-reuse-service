import type { Locator, Page } from "@playwright/test";

export class ConfirmDetailsPage {
  static readonly path = "/confirm-details";

  readonly heading: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "You have already proved your identity", level: 1 });
    this.continueButton = page.getByRole("button", { name: "Continue" });
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
