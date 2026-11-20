import type { Locator, Page } from "@playwright/test";

export class NotFoundErrorPage {
  static readonly path = "/error/not-found";

  readonly heading: Locator;
  readonly message: Locator;

  constructor(page: Page) {
    this.heading = page.getByRole("heading", { name: "Page not found", level: 1 });
    this.message = page.getByText(
      "Go back to the service you were trying to use and start again. You can look for the service using your search engine or find it from the GOV.UK homepage."
    );
  }
}
