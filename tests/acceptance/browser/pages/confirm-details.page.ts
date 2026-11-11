import type { Locator, Page } from "@playwright/test";
import { ElementNotFoundError } from "../support/element-not-found-error.js";

export class ConfirmDetailsPage {
  static readonly path = "/confirm-details";

  readonly heading: Locator;
  readonly continueButton: Locator;
  readonly fullNameValue: Locator;
  readonly dateOfBirthValue: Locator;
  readonly addressValue: Locator;
  readonly updateDetailsSummary: Locator;
  readonly updateDetailsButton: Locator;
  readonly csrsInputValue: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Confirm your details", level: 1 });
    this.continueButton = page.getByRole("button", { name: "Confirm and continue" });
    this.updateDetailsSummary = page.getByRole("group").getByText("If your details are wrong");
    this.updateDetailsButton = page.getByRole("button", { name: "update your details" });
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
    this.csrsInputValue = page.locator('input[name="_csrf"]');
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async setCsrs(csrs: string): Promise<void> {
    if ((await this.csrsInputValue.count()) === 0) {
      throw new ElementNotFoundError('input[name="_csrf"]');
    }

    await this.csrsInputValue.evaluate((element, newValue) => {
      if (element instanceof HTMLInputElement) {
        element.value = newValue;
      }
    }, csrs);
  }

  async updateDetails(): Promise<void> {
    if (!(await this.updateDetailsButton.isVisible())) {
      await this.updateDetailsSummary.click();
    }
    await this.updateDetailsButton.click();
  }
}
