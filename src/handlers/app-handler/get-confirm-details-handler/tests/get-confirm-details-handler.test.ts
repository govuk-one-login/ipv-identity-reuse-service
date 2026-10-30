import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { afterEach, beforeEach, describe, expect, it, vi, vitest } from "vitest";
import translations from "../../../../../locales/en/translation.json" with { type: "json" };
import { EVCSIdentityResponse } from "../../../../api/evcs-api.js";
import { getSessionDetails, updateSessionData } from "../../../../api/oauth-internal-api.js";
import { getConfiguration } from "../../../../configuration/configuration.js";
import type { StoredIdentityValidationResult } from "../../../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../../../domain/stored-identity/stored-identity-validator.js";
import { HttpCodesEnum } from "../../../../utilities/constants.js";
import {
  EVCSError,
  GetSessionError,
  SessionInvalidError,
  StoredIdentityValidationError,
} from "../../../../utilities/errors.js";
import logger from "../../../../utilities/logger.js";
import { handler } from "../get-confirm-details-handler.js";
import { extractUserDetails } from "../user-details-content.js";
import { getReuseDecision } from "../../../../domain/reuse/reuse-decision.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import {
  redirectToSessionExpiredPageExpress,
  redirectToOauthCallBackExpress,
  redirectToErrorPageExpress,
} from "../../../../api/sis-api.js";

const mockRender = vi.hoisted(() => vi.fn().mockReturnValue("Rendered Confirm Details Screen"));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn(() => ({
      render: mockRender,
      addFilter: vi.fn(),
    })),
  },
}));

vitest.mock("../../../../api/sis-api.js");
vitest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: class {
    addDimensions = vi.fn();
    addMetric = vi.fn();
    publishStoredMetrics = vi.fn();
  },
}));

vi.mock("../../../../utilities/logger");
vi.mock("../../../../domain/stored-identity/stored-identity-validator.js");
vi.mock("../../../../api/oauth-internal-api.js");
vi.mock("../user-details-content.js");
vi.mock("../../../../configuration/configuration.js");
vi.mock("../../../../domain/verifiable-credential/identity-expiry-service.js");
vi.mock("../../../../domain/stored-identity/calculate-vot.js");
vi.mock("../../../../utilities/jwt-utilities.js");
vi.mock("../../../../domain/reuse/reuse-decision.js");

const INDEX_PATH_REGEX = /index.njk$/;

const mockIdentityResponse: EVCSIdentityResponse = {
  si: {
    vc: "header.payload.signature",
    metadata: undefined,
    unsignedVot: "P2",
  },
  vcs: [{ state: "CURRENT", vc: "vc-jwt", metadata: undefined }],
};

beforeEach(() => {
  vi.stubEnv("DOMAIN_NAME", "test-domain");
  vi.stubEnv("PUBLIC_API", "example-api.com");
  vi.mocked(extractUserDetails).mockReturnValue({
    name: "Jane Doe",
    dateOfBirth: "1990-01-15",
    addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
  });
  vi.mocked(getIdentityFromCredentialStore).mockResolvedValue(mockIdentityResponse);
  vi.mocked(validateStoredIdentity).mockResolvedValue({
    kidValid: true,
    signatureValid: true,
    isValid: true,
    storedIdentityRecord: {
      sub: "user-sub",
      credentials: [],
      vot: "P2",
      claims: {
        "https://vocab.account.gov.uk/v1/coreIdentity": {
          name: [KENNETH_DECERQUEIRA],
          birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        },
        "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
      },
    },
  });
  vi.mocked(getSessionDetails).mockResolvedValue({
    vtr: ["P2"],
    storageAccessToken: "mock-storage-access-token",
    clientSessionId: "client-session-id",
    subject: "user-sub",
  });
  vi.mocked(getConfiguration).mockResolvedValue({
    evcsApiUrl: "https://evcs.gov.uk",
    controllerAllowList: [],
    fraudIssuer: ["fraudCRI"],
    fraudValidityPeriod: 180,
  } as never);
  vi.mocked(getReuseDecision).mockReturnValue({
    isReusable: true,
    reason: {
      expired: false,
      drivingLicenceExpired: false,
      fraudExpired: false,
      securityCheckPresent: true,
      votSufficient: true,
    },
    rawData: { vot: "P2" },
  });
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should store the calculated vot and identity hash in the session and render the confirm details screen", async () => {
  const { request, response, next } = createExpressRequest();

  vi.mocked(validateStoredIdentity).mockResolvedValue({
    kidValid: true,
    signatureValid: true,
    isValid: true,
    storedIdentityRecord: {
      sub: "user-sub",
      credentials: [],
      vot: "P2",
      claims: {
        "https://vocab.account.gov.uk/v1/coreIdentity": {
          name: [KENNETH_DECERQUEIRA],
          birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        },
        "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
      },
    },
  });

  await handler(request, response, next);

  expect(getSessionDetails).toHaveBeenCalledWith("test-session-id");
  expect(getIdentityFromCredentialStore).toHaveBeenCalledWith("Bearer mock-storage-access-token");
  expect(updateSessionData).toHaveBeenCalledTimes(1);
  expect(updateSessionData).toHaveBeenCalledWith("test-session-id", {
    storedIdentitySha256: "02d6bdfbfb3bf45077a34e2252816c1ddc906a8947b29d0ba7185381f2c1a794",
    vot: "P2",
  });

  expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
  expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
    assetPath: "./assets",
    rootPath: ".",
    govukRebrand: true,
    userDetails: {
      name: "Jane Doe",
      dateOfBirth: "1990-01-15",
      addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
    },
    translations,
  });
});

describe("handler record validation", () => {
  it("renders confirm-details page when all records are valid and validated", async () => {
    vi.mocked(validateStoredIdentity).mockResolvedValue({
      kidValid: true,
      signatureValid: true,
      isValid: true,
      storedIdentityRecord: {
        sub: "user-sub",
        credentials: [],
        vot: "P2",
        claims: {
          "https://vocab.account.gov.uk/v1/coreIdentity": {
            name: [KENNETH_DECERQUEIRA],
            birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
          },
          "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
        },
      },
    });
    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);
    expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
    expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
      assetPath: "./assets",
      rootPath: ".",
      govukRebrand: true,
      userDetails: {
        name: "Jane Doe",
        dateOfBirth: "1990-01-15",
        addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
      },
      translations,
    });
  });

  it.each([
    { kidValid: false, signatureValid: true, isValid: true },
    { kidValid: false, signatureValid: false, isValid: true },
    { kidValid: false, signatureValid: true, isValid: false },
  ])("redirects to client when validation fails (%o)", async (verdict) => {
    vitest.mocked(validateStoredIdentity).mockResolvedValue(verdict as StoredIdentityValidationResult);
    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_unavailable" });
    expect(redirectToOauthCallBackExpress).toHaveBeenCalledWith(response);
  });

  it("returns an error when session cookie is missing", async () => {
    const { request, response, next } = createExpressRequest({ cookies: {} });
    await handler(request, response, next);
    expect(getSessionDetails).not.toHaveBeenCalled();
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(redirectToSessionExpiredPageExpress).toHaveBeenCalledWith(response);
  });

  it("returns a failure response with a 500 status code when storageAccessToken is not returned from the session", async () => {
    vitest.mocked(getSessionDetails).mockResolvedValueOnce({
      subject: "user-sub",
      storageAccessToken: undefined,
      clientSessionId: "client-session-id",
    });
    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  });

  it("returns a failure response when the EVCS call fails", async () => {
    vi.mocked(getIdentityFromCredentialStore).mockRejectedValue(new EVCSError(HttpCodesEnum.INTERNAL_SERVER_ERROR));

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(validateStoredIdentity).not.toHaveBeenCalled();
    expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to client when EVCS returns a 404", async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    vitest.mocked(getIdentityFromCredentialStore).mockResolvedValue(undefined);

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(validateStoredIdentity).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_unavailable" });
    expect(redirectToOauthCallBackExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to the session-expired page when getSessionDetails throws a SessionInvalidError", async () => {
    vitest
      .mocked(getSessionDetails)
      .mockRejectedValueOnce(new SessionInvalidError("No session found for the given sessionId"));

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(redirectToSessionExpiredPageExpress).toHaveBeenCalledWith(response);
  });

  it("returns a failure response when getSessionDetails throws", async () => {
    vitest
      .mocked(getSessionDetails)
      .mockRejectedValueOnce(new Error("GET session endpoint returned an error response"));

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to the error page when getSessionDetails throws a 500 GetSessionError", async () => {
    vitest
      .mocked(getSessionDetails)
      .mockRejectedValueOnce(new GetSessionError("GET session endpoint returned an error response"));

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to client when stored identity record is missing required user details", async () => {
    vitest.mocked(validateStoredIdentity).mockRejectedValue(new StoredIdentityValidationError());

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(mockRender).not.toHaveBeenCalled();
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_unavailable" });
    expect(redirectToOauthCallBackExpress).toHaveBeenCalledWith(response);
  });
});

describe("reuse decision", () => {
  it("should redirect to callback when reuse decision is false", async () => {
    vi.mocked(getReuseDecision).mockReturnValue({
      isReusable: false,
      reason: {
        expired: true,
        drivingLicenceExpired: false,
        fraudExpired: true,
        securityCheckPresent: true,
        votSufficient: true,
      },
      rawData: { vot: "P2" },
    });

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_unavailable" });
    expect(redirectToOauthCallBackExpress).toHaveBeenCalledWith(response);
  });

  it("should redirect to unrecoverable page and log error if reuse decision is false and session update fails", async () => {
    vi.mocked(getReuseDecision).mockReturnValue({
      isReusable: false,
      reason: {
        expired: true,
        drivingLicenceExpired: true,
        fraudExpired: false,
        securityCheckPresent: true,
        votSufficient: false,
      },
      rawData: { vot: "P0" },
    });
    vi.mocked(updateSessionData).mockRejectedValueOnce(
      new Error("PATCH session/data endpoint returned an error response")
    );

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_unavailable" });
    expect(logger.error).toHaveBeenCalledWith(
      "Error in lambdaHandler event: Error: PATCH session/data endpoint returned an error response"
    );
    expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  });

  it("should render confirm details page when reuse decision is true", async () => {
    vi.mocked(getReuseDecision).mockReturnValue({
      isReusable: true,
      reason: {
        expired: false,
        drivingLicenceExpired: false,
        fraudExpired: false,
        securityCheckPresent: true,
        votSufficient: true,
      },
      rawData: { vot: "P2" },
    });

    const { request, response, next } = createExpressRequest();
    await handler(request, response, next);

    expect(response.header).toHaveBeenCalledWith("content-type", "text/html");
    expect(response.render).toHaveBeenCalledWith(expect.stringMatching(INDEX_PATH_REGEX), {
      assetPath: "./assets",
      rootPath: ".",
      govukRebrand: true,
      userDetails: {
        name: "Jane Doe",
        dateOfBirth: "1990-01-15",
        addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
      },
      translations,
    });
  });
});
