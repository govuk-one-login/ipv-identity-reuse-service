import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi, vitest } from "vitest";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import { EVCSIdentityResponse } from "../../../api/evcs-api.js";
import { getSessionDetails, updateSessionData } from "../../../api/oauth-internal-api.js";
import { getConfiguration } from "../../../configuration/configuration.js";
import { calculateVot } from "../../../domain/stored-identity/calculate-vot.js";
import type { StoredIdentityValidationResult } from "../../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../../domain/stored-identity/stored-identity-validator.js";
import { hasIdentityExpired } from "../../../domain/verifiable-credential/identity-expiry-service.js";
import { HttpCodesEnum } from "../../../utilities/constants.js";
import {
  EVCSError,
  GetSessionError,
  SessionInvalidError,
  StoredIdentityValidationError,
} from "../../../utilities/errors.js";
import { getJwtBody } from "../../../utilities/jwt-utilities.js";
import logger from "../../../utilities/logger.js";
import { lambdaHandler } from "../get-confirm-details-handler.js";
import { extractUserDetails } from "../user-details-content.js";

const mockRender = vi.hoisted(() => vi.fn().mockReturnValue("Rendered Confirm Details Screen"));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn(() => ({
      render: mockRender,
      addFilter: vi.fn(),
    })),
  },
}));

vitest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: class {
    addDimensions = vi.fn();
    addMetric = vi.fn();
    publishStoredMetrics = vi.fn();
  },
}));

vi.mock("../../../utilities/logger");
vi.mock("../../../domain/stored-identity/stored-identity-validator.js");
vi.mock("../../../api/oauth-internal-api.js");
vi.mock("../user-details-content.js");
vi.mock("../../../configuration/configuration.js");
vi.mock("../../../domain/verifiable-credential/identity-expiry-service.js");
vi.mock("../../../domain/stored-identity/calculate-vot.js");
vi.mock("../../../utilities/jwt-utilities.js");
// vi.mock("../../../domain/stored-identity/stored-identity-validator");

// vi.mock("../user-details-content", () => ({
//   extractUserDetails: vi.fn().mockReturnValue({
//     name: "Jane Doe",
//     dateOfBirth: "1990-01-15",
//     addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
//   }),
// }));

// vi.mock("../../../api/oauth-internal-api", () => ({
//   getSessionDetails: vi.fn().mockResolvedValue({
//     storageAccessToken: "mock-storage-access-token",
//     subject: "user-sub",
//     vtr: ["P2"],
//   }),
//   updateSessionData: vi.fn().mockImplementation(() => Promise.resolve()),
// }));

vi.mock("../../../utilities/cookie-utilities", () => ({
  getCookieValues: vi.fn().mockReturnValue(new Map([["identity_reuse_service_session", "test-session-id"]])),
}));

const mockIdentityResponse: EVCSIdentityResponse = {
  si: {
    vc: "header.payload.signature",
    metadata: undefined,
    unsignedVot: "P2",
  },
  vcs: [{ state: "CURRENT", vc: "vc-jwt", metadata: undefined }],
};

const validEvent = () =>
  ({
    queryStringParameters: {
      redirect_uri: "https://example.com",
      state: "state-id",
      client_id: "client",
    },
    headers: {
      authorization: "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJzdWIiOiJ1c2VyLWlkIn0.signature",
    },
  }) as never as APIGatewayProxyEvent;

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
  vi.mocked(hasIdentityExpired).mockResolvedValue({
    fraudExpired: false,
    drivingLicenceExpired: false,
    expired: false,
  });
  vi.mocked(getJwtBody).mockReturnValue({ sub: "user-sub", vot: "P2", max_vot: "P2" } as never);
  vi.mocked(calculateVot).mockReturnValue("P2");
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should store the calculated vot and identity hash in the session and render the confirm details screen", async () => {
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
  const result = await lambdaHandler(validEvent(), {} as Context);

  expect(getSessionDetails).toHaveBeenCalledWith("test-session-id");
  expect(getIdentityFromCredentialStore).toHaveBeenCalledWith("Bearer mock-storage-access-token");
  expect(mockRender).toHaveBeenCalledExactlyOnceWith(
    expect.toSatisfy((filename: string) => filename.endsWith("index.njk")),
    {
      assetPath: "./assets",
      rootPath: ".",
      govukRebrand: true,
      userDetails: {
        name: "Jane Doe",
        dateOfBirth: "1990-01-15",
        addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
      },
      translations,
    }
  );

  expect(updateSessionData).toHaveBeenCalledTimes(1);
  expect(updateSessionData).toHaveBeenCalledWith("test-session-id", {
    storedIdentitySha256: "02d6bdfbfb3bf45077a34e2252816c1ddc906a8947b29d0ba7185381f2c1a794",
    vot: "P2",
  });

  expect(result).toEqual({
    body: "Rendered Confirm Details Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 200,
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
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(mockRender).toHaveBeenCalledWith(expect.stringContaining("index.njk"), expect.any(Object));
    expect(result.statusCode).toBe(200);
  });

  it.each([
    { kidValid: false, signatureValid: true, isValid: true },
    { kidValid: false, signatureValid: false, isValid: true },
    { kidValid: false, signatureValid: true, isValid: false },
  ])("redirects to client when validation fails (%o)", async (verdict) => {
    vitest.mocked(validateStoredIdentity).mockResolvedValue(verdict as StoredIdentityValidationResult);
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
      body: "",
    });
  });

  it("returns an error when session cookie is missing", async () => {
    const { getCookieValues } = await import("../../../utilities/cookie-utilities.js");
    vitest.mocked(getCookieValues).mockReturnValueOnce(new Map());
    const result = await lambdaHandler({
      queryStringParameters: { redirect_uri: "test.com", state: "state", client_id: "client_id" },
      headers: {},
    } as never as APIGatewayProxyEvent, {} as Context);
    expect(getSessionDetails).not.toHaveBeenCalled();
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/session-expired" },
      body: "",
    });
  });

  it("returns a failure response with a 500 status code when storageAccessToken is not returned from the session", async () => {
    vitest.mocked(getSessionDetails).mockResolvedValueOnce({
      subject: "user-sub",
      storageAccessToken: undefined,
      clientSessionId: "client-session-id",
    });
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });

  it("returns a failure response when the EVCS call fails", async () => {
    vi.mocked(getIdentityFromCredentialStore).mockRejectedValue(new EVCSError(HttpCodesEnum.INTERNAL_SERVER_ERROR));
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(validateStoredIdentity).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
      statusCode: 302,
      body: "",
    });
  });

  it("redirects to client when EVCS returns a 404", async () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    vitest.mocked(getIdentityFromCredentialStore).mockResolvedValue(undefined);
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(validateStoredIdentity).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
      body: "",
    });
  });

  it("redirects to the session-expired page when getSessionDetails throws a SessionInvalidError", async () => {
    vitest
      .mocked(getSessionDetails)
      .mockRejectedValueOnce(new SessionInvalidError("No session found for the given sessionId"));
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/session-expired" },
      body: "",
    });
  });

  it("returns a failure response when getSessionDetails throws", async () => {
    vitest.mocked(getSessionDetails).mockRejectedValueOnce(new Error("GET session endpoint returned an error response"));
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
      statusCode: 302,
      body: "",
    });
  });

  it("redirects to the error page when getSessionDetails throws a 500 GetSessionError", async () => {
    vitest
      .mocked(getSessionDetails)
      .mockRejectedValueOnce(new GetSessionError("GET session endpoint returned an error response"));
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(getIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });

  it("redirects to client when stored identity record is missing required user details", async () => {
    vitest.mocked(validateStoredIdentity).mockRejectedValue(new StoredIdentityValidationError());
    const result = await lambdaHandler(validEvent(), {} as Context);
    expect(mockRender).not.toHaveBeenCalled();
    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
      body: "",
    });
  });
});

describe("combined expiry and VoT checks", () => {
  it("should redirect to client when both identity is expired and VoT is insufficient", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
    });
  });

  it("should redirect to client when both identity is expired and VoT is insufficient and log an error if the session update fails", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");
    vi.mocked(updateSessionData).mockRejectedValueOnce(
      new Error("PATCH session/data endpoint returned an error response")
    );

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(logger.error).toHaveBeenCalledWith(
      "Failed to update session data: Error: PATCH session/data endpoint returned an error response"
    );
    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
    });
  });

  it("should redirect to client when only fraud check is expired but VoT is sufficient", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: true,
      drivingLicenceExpired: false,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
    });
  });

  it("should redirect to client when only driving licence is expired but VoT is sufficient", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: false,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
    });
  });

  it("should redirect to client when only VoT is insufficient but identity is not expired", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(updateSessionData).toHaveBeenCalledWith("test-session-id", { errorDescription: "record_update_requested" });
    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://example-api.com/oauth2/callback",
      },
    });
  });

  it("should render confirm details page when neither check fails", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = await lambdaHandler(validEvent(), {} as Context);

    expect(result.statusCode).toBe(200);
    expect(mockRender).toHaveBeenCalled();
  });

  it("should always execute both checks before failing", async () => {
    vi.mocked(hasIdentityExpired).mockResolvedValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    await lambdaHandler(validEvent(), {} as Context);

    expect(hasIdentityExpired).toHaveBeenCalled();
    expect(calculateVot).toHaveBeenCalled();
  });
});
