import { setDefaultTimeout, Before, defineParameterType } from "@cucumber/cucumber";
import { Response } from "superagent";
import { randomString } from "../../../shared-test/string-utilities";
import { getDidControllerName, getSigningKeyId } from "./utils/ssm-utilities";
import { AuthorizationResponse, OAuthBadRequest, RedirectResponse, TokenResponse } from "./utils/auth-api";

export type WorldDefinition = {
  testDidController: string;
  keyId: string;
  userId: string;
  bearerToken?: string;
  redirectUri?: string;
  state?: string;
  requestedVtr: string[];
  govukSigninJourneyId: string;
  credentialJwts: string[];
  userIdentityPostResponse?: Response;
  redirectResponse?: RedirectResponse | Error;
  authorizationResponse?: AuthorizationResponse | OAuthBadRequest;
  tokenResponse?: TokenResponse | OAuthBadRequest;
};

setDefaultTimeout(20_000);

defineParameterType({
  name: "boolean",
  regexp: /true|false/,
  transformer: (s) => s === "true",
});

Before<WorldDefinition>(async function () {
  this.userId = generateRandomTestUserId();
  this.govukSigninJourneyId = randomString(12);
  this.redirectUri = undefined;
  this.state = undefined;
  this.requestedVtr = ["P2"];
  this.credentialJwts = [];
  this.testDidController = await getDidControllerName();
  this.keyId = await getSigningKeyId();
  this.redirectResponse = undefined;
  this.authorizationResponse = undefined;
  this.tokenResponse = undefined;
});

function generateRandomTestUserId() {
  const randomTestUserId = "urn:fdc:gov.uk:2022:TEST_USER-".concat(
    randomString(10),
    "-",
    randomString(4),
    "-",
    randomString(1),
    "-",
    randomString(18)
  );
  return randomTestUserId;
}
