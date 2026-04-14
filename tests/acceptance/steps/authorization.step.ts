import { Given, Then, When } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step";
import {
  AuthorizationResponseType,
  authorize,
  isAuthorizationResponse,
  isTokenResponse,
  token,
  TokenGrantType,
} from "./utils/auth-api";
import assert from "node:assert";
import { sisGetUserIdentityHandler } from "./utils/sis-api";

Given<WorldDefinition>("I have a user profile", function () {
  // Do nothing, this is currently a placeholder with a verb to make it clear
  // what may be happening. In the future it's expected that this will set up
  // user credentials.
});

When<WorldDefinition>("I call the authorize endpoint, to redirect to {string}", async function (redirectUri: string) {
  this.authorizationResponse = await authorize({
    client_id: "acceptance-tests",
    state: "acceptance-tests",
    response_type: AuthorizationResponseType.code,
    redirect_uri: redirectUri,
  });
});

Then<WorldDefinition>(
  "I will be issued with an authorization code and redirected to {string}",
  function (redirectUri: string) {
    assert.ok(isAuthorizationResponse(this.authorizationResponse));
    assert.ok(this.authorizationResponse.code);
    assert.equal(this.authorizationResponse.origin, redirectUri);
  }
);

When<WorldDefinition>("I call the token endpoint with the authorization code", async function () {
  assert.ok(isAuthorizationResponse(this.authorizationResponse));
  assert.ok(this.authorizationResponse.code);

  this.tokenResponse = await token({
    grant_type: TokenGrantType.AuthorizationCode,
    code: this.authorizationResponse.code,
  });
});

Then<WorldDefinition>("I will be issued with an authorization token", function () {
  assert.ok(isTokenResponse(this.tokenResponse));
  assert.ok(this.tokenResponse.access_token);
  assert.equal(this.tokenResponse.token_type, "Bearer");
});

When<WorldDefinition>("I call the user-identity endpoint", async function () {
  assert.ok(isTokenResponse(this.tokenResponse));

  this.userIdentityPostResponse = await sisGetUserIdentityHandler(
    {
      vtr: this.requestedVtr,
      govukSigninJourneyId: this.govukSigninJourneyId,
    },
    this.tokenResponse.access_token
  );
});

Then<WorldDefinition>("I will be issued with my user-identity", function () {
  assert.ok(this.userIdentityPostResponse);
  assert.deepEqual(this.userIdentityPostResponse.body, {
    sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
    iss: "http://api.example.com",
    credentials: ["sample-credential-id"],
    vot: "P2",
    vtm: "https://oidc.account.gov.uk/trustmark",
  });
});
