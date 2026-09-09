import { expect, test } from "./fixtures";
import { sisBaseUrl, sisPrivateApiUrl } from "./support/environment";
import { generateRandomTestUserId } from "../shared/utils/user-subject-id";
import {
  createAndPostDcmawPassportCredentialWithUserDetails,
  createAndPostFraudCheckCredential,
} from "../shared/helpers/credential-helpers";
import { createStoredIdentityWithVot } from "../shared/helpers/identity-helper";
import { getDidControllerName, getSigningKeyId } from "../shared/utils/ssm-utilities";

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
      await createAndPostDcmawPassportCredentialWithUserDetails(userId, new Date(), {
        name: [
          {
            nameParts: [
              { type: "GivenName" as const, value: "Jane" },
              { type: "FamilyName" as const, value: "Doe" },
            ],
          },
        ],
        birthDate: [{ value: "1990-01-15" }],
        address: [
          { streetName: "Downing Street", buildingNumber: "10", addressLocality: "London", postalCode: "SW1A 2AA" },
        ],
      }),
      await createAndPostFraudCheckCredential(userId, new Date()),
    ];
    await createStoredIdentityWithVot(
      userId,
      credentialJwts,
      "P2",
      await getDidControllerName(),
      await getSigningKeyId()
    );

    await orchestrationStub.goto();
    await orchestrationStub.setPublicUrl(sisPublicUrl);
    await orchestrationStub.setPrivateUrl(sisPrivateUrl);
    await orchestrationStub.setUserId(userId);
    await orchestrationStub.continue();

    await expect(confirmDetails.fullNameValue).toHaveText("Jane Doe");
    await expect(confirmDetails.dateOfBirthValue).toHaveText("15 January 1990");
    await expect(confirmDetails.addressValue).toContainText("10, Downing Street");
  });
});
