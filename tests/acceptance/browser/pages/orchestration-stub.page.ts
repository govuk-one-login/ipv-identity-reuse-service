import type { Locator, Page } from "@playwright/test";

export const authorizationRequestFields = {
  subject: "Enter userId manually (sub)",
  signInJourneyId: "Sign In Journey Id (govuk_signin_journey_id)",
  responseType: "Response type (response_type)",
  redirectUri: "Redirect URI (redirect_uri)",
  clientId: "Client ID (client_id)",
  issuer: "Issuer (iss)",
  audience: "Audience (aud)",
  state: "State (state)",
  issuedAt: "Issued at (iat)",
  notBefore: "Not before (nbf)",
  expiry: "Expiry (exp)",
  sisPublicUrl: "Authorisation server (SIS) public URL",
  sisPrivateUrl: "Authorisation server (SIS) private URL",
} as const;

export type AuthorizationRequestField = keyof typeof authorizationRequestFields;

export class OrchestrationStubPage {
  readonly heading: Locator;
  readonly continueButton: Locator;
  readonly errorSummary: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole("heading", { name: "Orchestration stub", exact: true });
    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.errorSummary = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  field(name: AuthorizationRequestField): Locator {
    return this.page.getByLabel(authorizationRequestFields[name], { exact: true });
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }

  async setUserId(userId: string) {
    await this.page.getByLabel(authorizationRequestFields.subject).fill(userId);
  }

  async setPublicUrl(url: string) {
    await this.page.getByLabel(authorizationRequestFields.sisPublicUrl).fill(url);
  }

  async setPrivateUrl(url: string) {
    await this.page.getByLabel(authorizationRequestFields.sisPrivateUrl).fill(url);
  }
}
