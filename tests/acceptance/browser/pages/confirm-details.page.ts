import type { Locator, Page } from "@playwright/test";

export class ConfirmDetailsPage {
  static readonly path = "/confirm-details";

  readonly heading: Locator;
  readonly continueButton: Locator;
  readonly fullNameValue: Locator;
  readonly dateOfBirthValue: Locator;
  readonly addressValue: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Confirm your details", level: 1 });
    this.continueButton = page.getByRole("button", { name: "Confirm and continue" });
    const summaryList = page.locator(".govuk-summary-list");
    this.fullNameValue = summaryList
      .locator(".govuk-summary-list__row", {
        hasText: "Full name",
      })
      .locator(".govuk-summary-list__value");
    this.dateOfBirthValue = summaryList
      .locator(".govuk-summary-list__row", {
        hasText: "Date of birth",
      })
      .locator(".govuk-summary-list__value");
    this.addressValue = summaryList
      .locator(".govuk-summary-list__row", {
        hasText: "Current home address",
      })
      .locator(".govuk-summary-list__value");
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
