import { expect, test } from "./fixtures";
import { ConfirmDetailsPage } from "./pages/confirm-details.page";
import type { AuthorizationRequestField } from "./pages/orchestration-stub.page";
import { UnrecoverableErrorPage } from "./pages/unrecoverable-error.page";
import { generateRandomTestUserId } from "../shared/utils/user-subject-id";
import { createStoredIdentityWithVot } from "../shared/helpers/identity-helper";
import { getDidControllerName, getSigningKeyId } from "../shared/utils/ssm-utilities";
import {
  createAndPostDcmawPassportCredential,
  createAndPostFraudCheckCredential,
} from "../shared/helpers/credential-helpers";

const AN_HOUR = 60 * 60;
const TEN_MINUTES = 10 * 60;

const unixSecondsFromNow = (offsetSeconds: number): string => {
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return String(nowInSeconds + offsetSeconds);
};

type RejectedRequest = {
  scenario: string;
  field: AuthorizationRequestField;
  value: string;
};

const rejectedRequests: ReadonlyArray<RejectedRequest> = [
  {
    scenario: "the client_id is not a registered client",
    field: "clientId",
    value: "not-orchestrator",
  },
  {
    scenario: "the issuer is not the registered orchestrator",
    field: "issuer",
    value: "not-orchestrator",
  },
  {
    scenario: "the audience is another service",
    field: "audience",
    value: "https://example.com",
  },
  {
    scenario: "the not-before is in the future",
    field: "notBefore",
    value: unixSecondsFromNow(AN_HOUR),
  },
  {
    scenario: "the expiry is in the past",
    field: "expiry",
    value: unixSecondsFromNow(-TEN_MINUTES),
  },
];

test.describe("Authorization workflow", () => {
  test("takes the user from the stub to the confirm details page", async ({
    page,
    orchestrationStub,
    confirmDetails,
  }) => {
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
      await getSigningKeyId()
    );

    await orchestrationStub.goto();
    await expect(orchestrationStub.heading).toBeVisible();

    await orchestrationStub.setUserId(userId);
    await orchestrationStub.continue();

    await expect(confirmDetails.heading).toBeVisible();
    await expect(page).toHaveURL((url) => {
      return url.pathname === ConfirmDetailsPage.path;
    });
  });

  test.describe("rejects an untrustworthy authorization request", () => {
    for (const { scenario, field, value } of rejectedRequests) {
      test(`sends the user to the unrecoverable error page when ${scenario}`, async ({
        page,
        orchestrationStub,
        unrecoverableError,
      }) => {
        await orchestrationStub.goto();
        await orchestrationStub.field(field).fill(value);

        await orchestrationStub.continue();

        await expect(unrecoverableError.heading).toBeVisible();
        await expect(unrecoverableError.message).toBeVisible();
        await expect(page).toHaveURL((url) => {
          return url.pathname === UnrecoverableErrorPage.path;
        });
      });
    }
  });
});
