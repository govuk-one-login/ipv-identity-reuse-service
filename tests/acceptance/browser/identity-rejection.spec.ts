import { expect, test } from "./fixtures.js";
import { OrchestrationStubPage } from "./pages/orchestration-stub.page.js";
import { generateRandomTestUserId } from "../shared/utils/user-subject-id.js";
import { createStoredIdentityWithVot } from "../shared/helpers/identity-helper.js";
import { getDidControllerName, getSigningKeyId } from "../shared/utils/ssm-utilities.js";
import {
  createAndPostCredentials,
  createAndPostDcmawDrivingPermitCredential,
  createAndPostDcmawPassportCredential,
  createAndPostFraudCheckCredential,
} from "../shared/helpers/credential-helpers.js";
import { sisBaseUrl, sisPrivateApiUrl } from "./support/environment.js";

const SEVEN_MONTHS_AGO = new Date(new Date().setMonth(new Date().getMonth() - 7));
const EXPIRED_LICENCE_DATE = "2020-01-01";

test.describe("Identity rejection scenarios", () => {
  let sisPublicUrl: string;
  let sisPrivateUrl: string;

  test.beforeAll(async () => {
    sisPublicUrl = await sisBaseUrl();
    sisPrivateUrl = await sisPrivateApiUrl();
  });

  const startJourney = async (orchestrationStub: OrchestrationStubPage, userId: string) => {
    await orchestrationStub.goto();
    await expect(orchestrationStub.heading).toBeVisible();
    await orchestrationStub.setPublicUrl(sisPublicUrl);
    await orchestrationStub.setPrivateUrl(sisPrivateUrl);
    await orchestrationStub.setUserId(userId);
    await orchestrationStub.uncheckCreateIdentity();
    await orchestrationStub.continue();
  };

  test("redirects a first-time user with no stored identity in EVCS back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a returning user with no stored identity in EVCS back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    await createAndPostCredentials(1, userId);

    await startJourney(orchestrationStub, userId);
    await expect(orchestrationStub.errorSummary).toBeVisible();
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a returning user with an invalid stored identity due to a data inconsistency back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    const originalCredentialJwts = [
      await createAndPostDcmawPassportCredential(userId, new Date()),
      await createAndPostFraudCheckCredential(userId, new Date()),
    ];

    await createStoredIdentityWithVot(
      userId,
      originalCredentialJwts,
      "P2",
      await getDidControllerName(),
      await getSigningKeyId(),
      undefined,
      "P3"
    );

    await createAndPostDcmawPassportCredential(userId, new Date());
    await createAndPostFraudCheckCredential(userId, new Date());

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a returning user with an expired DCMAW VC back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    const credentialJwts = [
      await createAndPostDcmawDrivingPermitCredential(userId, SEVEN_MONTHS_AGO, EXPIRED_LICENCE_DATE),
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

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a returning user with an expired Fraud VC back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    const credentialJwts = [
      await createAndPostDcmawPassportCredential(userId, new Date()),
      await createAndPostFraudCheckCredential(userId, SEVEN_MONTHS_AGO),
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

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a user whose stored identity does not meet the requested VTR back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    const credentialJwts = [
      await createAndPostDcmawPassportCredential(userId, new Date()),
      await createAndPostFraudCheckCredential(userId, new Date()),
    ];

    await createStoredIdentityWithVot(
      userId,
      credentialJwts,
      "P1",
      await getDidControllerName(),
      await getSigningKeyId(),
      undefined,
      "P1"
    );

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });

  test("redirects a returning M1C user with an empty Fraud VC back to the client with an error", async ({
    page,
    orchestrationStub,
  }) => {
    const userId = generateRandomTestUserId();
    const credentialJwts = [await createAndPostDcmawPassportCredential(userId, new Date())];
    await createStoredIdentityWithVot(
      userId,
      credentialJwts,
      "P2",
      await getDidControllerName(),
      await getSigningKeyId(),
      undefined,
      "P3"
    );

    await startJourney(orchestrationStub, userId);
    await expect(page).toHaveURL((url) => {
      return (
        url.searchParams.get("error") === "access_denied" &&
        url.searchParams.get("error_description") === "record_update_requested"
      );
    });
  });
});
