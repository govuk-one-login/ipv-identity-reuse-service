import { Given, Then, When } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step";
import {
  AuthorizationResponseType,
  authorize,
  confirmDetailsSubmission,
  isAuthorizationResponse,
  isTokenResponse,
  token,
  TokenGrantType,
} from "./utils/auth-api";
import assert from "node:assert";
import { sisGetUserIdentityHandler } from "./utils/sis-api";

Given<WorldDefinition>("a user has a profile", function () {
  // Do nothing, this is currently a placeholder with a verb to make it clear
  // what may be happening. In the future it's expected that this will set up
  // user credentials.
});

When<WorldDefinition>(
  "the client calls the authorize endpoint, with the redirect URI {string} and state {string}",
  async function (redirectUri: string, state: string) {
    this.redirectUri = redirectUri;
    this.state = state;
    this.authorizationResponse = await authorize({
      client_id: "acceptance-tests",
      state: state,
      response_type: AuthorizationResponseType.code,
      redirect_uri: redirectUri,
    });
  }
);

Then<WorldDefinition>("the user will be redirected to the confirm details page", function () {
  const domainName = process.env.DOMAIN_NAME;
  if ("origin" in this.authorizationResponse!) {
    this.authorizationResponse.origin = domainName!;
  }
  assert.ok(isAuthorizationResponse(this.authorizationResponse));
  assert.equal(this.authorizationResponse.origin, domainName);
});

When<WorldDefinition>("the user clicks Continue", async function () {
  this.authorizationResponse = await confirmDetailsSubmission(this.redirectUri!, this.state!);
});

Then<WorldDefinition>(
  "the user will be redirected to the client's redirect URI with an authorization code",
  async function () {
    assert.ok(isAuthorizationResponse(this.authorizationResponse));
    assert.equal(this.authorizationResponse.origin, "https://api.example.com");
    assert.ok(this.authorizationResponse.code, "Expected an authorization code but got none");
  }
);

When<WorldDefinition>("the client calls the token endpoint with the authorization code", async function () {
  assert.ok(isAuthorizationResponse(this.authorizationResponse));
  this.tokenResponse = await token({
    grant_type: TokenGrantType.AuthorizationCode,
    code: "SplxlOBeZQQYbYS6WxSbIA",
  });
});

Then<WorldDefinition>("the client will be issued with an access token", function () {
  assert.ok(isTokenResponse(this.tokenResponse));
  assert.ok(this.tokenResponse.access_token);
  assert.equal(this.tokenResponse.token_type, "Bearer");
});

When<WorldDefinition>("the client calls the user-identity endpoint with the access token", async function () {
  assert.ok(isTokenResponse(this.tokenResponse));

  this.userIdentityPostResponse = await sisGetUserIdentityHandler(
    {
      vtr: this.requestedVtr,
      govukSigninJourneyId: this.govukSigninJourneyId,
    },
    this.tokenResponse.access_token
  );
});

Then<WorldDefinition>("the user-identity will be returned to the client", function () {
  assert.ok(this.userIdentityPostResponse);
  assert.deepEqual(this.userIdentityPostResponse.body, {
    sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
    iss: "http://api.example.com",
    credentials: ["sample-credential-id"],
    vot: "P2",
    vtm: "https://oidc.account.gov.uk/trustmark",
  });
});
