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
import { sisPostUserIdentityHandler } from "./utils/sis-api";

Given<WorldDefinition>("I have a user profile", function () {
  // Do nothing, this is currently a placeholder with a verb to make it clear
  // what may be happening. In the future it's expected that this will set up
  // user credentials.
});

When<WorldDefinition>("I call the authorize endpoint", async function () {
  this.authorizationResponse = await authorize({
    client_id: "acceptance-tests",
    response_type: AuthorizationResponseType.code,
    redirect_uri: "https://api.example.com",
  });
});

Then<WorldDefinition>("I will be issued with an authorization code and redirected to the endpoint", function () {
  assert.ok(isAuthorizationResponse(this.authorizationResponse));
  assert.ok(this.authorizationResponse.code);
});

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
});

When<WorldDefinition>("I call the user-identity endpoint", async function () {
  assert.ok(isTokenResponse(this.tokenResponse));

  this.userIdentityPostResponse = await sisPostUserIdentityHandler(
    {
      vtr: this.requestedVtr,
      govukSigninJourneyId: this.govukSigninJourneyId,
    },
    this.tokenResponse.access_token
  );
});

Then<WorldDefinition>("I will be issued with my user-identity", function () {
  assert.ok(this.userIdentityPostResponse);
  assert.deepEqual(this.userIdentityPostResponse.body, {});
});
