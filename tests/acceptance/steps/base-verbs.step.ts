import { setDefaultTimeout, Before, defineParameterType } from "@cucumber/cucumber";
import { Response } from "superagent";
import { randomString } from "./utils/string-utils";

export type WorldDefinition = {
  userId: string;
  bearerToken?: string;
  requestedVtr: string[];
  govukSigninJourneyId: string;
  userIdentityPostResponse?: Response;
};

setDefaultTimeout(20000);

defineParameterType({
  name: "boolean",
  regexp: /true|false/,
  transformer: (s) => s === "true",
});

Before<WorldDefinition>(function () {
  this.userId = generateRandomTestUserId();
  this.govukSigninJourneyId = randomString(12);
  this.requestedVtr = ["P2"];
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
