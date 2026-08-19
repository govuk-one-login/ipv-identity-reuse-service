import { expect, test } from "./fixtures.js";
import { sisBaseUrl, sisPrivateApiUrl } from "./support/environment.js";
import { generateRandomTestUserId } from "../shared/utils/user-subject-id.js";
import {
  createAndPostDcmawPassportCredential,
  createAndPostFraudCheckCredential,
} from "../shared/helpers/credential-helpers.js";
import { createStoredIdentityWithVot } from "../shared/helpers/identity-helper.js";
import { getDidControllerName, getSigningKeyId } from "../shared/utils/ssm-utilities.js";

test.describe("Confirm details page", () => {
  let sisPublicUrl: string;
  let sisPrivateUrl: string;

  test.beforeAll(async () => {
    sisPublicUrl = await sisBaseUrl();
    sisPrivateUrl = await sisPrivateApiUrl();
  });

  test("displays the correct user details", async ({ orchestrationStub, confirmDetails }) => {
    const userId = generateRandomTestUserId();
    const credentialJwts = [
      await createAndPostDcmawPassportCredential(userId, new Date()),
      await createAndPostFraudCheckCredential(userId, new Date()),
    ];
    await createStoredIdentityWithVot(
      userId,
      credentialJwts,
      "P2",
      await getDidControllerName(),
      await getSigningKeyId(),
      undefined,
      "P3"
    );

    await orchestrationStub.goto();
    await orchestrationStub.setPublicUrl(sisPublicUrl);
    await orchestrationStub.setPrivateUrl(sisPrivateUrl);
    await orchestrationStub.setUserId(userId);
    await orchestrationStub.continue();

    await expect(confirmDetails.fullNameValue).toHaveText("KENNETH DECERQUEIRA");
    await expect(confirmDetails.dateOfBirthValue).toHaveText("8 July 1965");
    await expect(confirmDetails.addressValue).toContainText("8, HADLEY ROAD");
  });
});
