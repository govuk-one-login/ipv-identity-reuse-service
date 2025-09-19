import { setDefaultTimeout, Before } from "@cucumber/cucumber";
import { Response } from "superagent";
import { randomString } from "./utils/stringUtils";

export type WorldDefinition = {
  userId: string;
  bearerToken?: string;
  userIdentityPostResponse?: Response;
};

setDefaultTimeout(20000);

Before<WorldDefinition>(function () {
  this.userId = generateRandomTestUserId();
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
