import type { Locator, Page } from "@playwright/test";

export class UnrecoverableErrorPage {
  static readonly path = "/error/unrecoverable";

  readonly heading: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Sorry, there is a problem", level: 1 });
    this.message = page.getByText("We cannot confirm your identity right now.");
  }
}
