import { afterEach, beforeEach, describe, expect, it, Mock, vi, vitest } from "vitest";
import { lambdaHandler } from "../get-confirm-details-handler.js";
import { APIGatewayProxyEvent } from "aws-lambda";
import { handleGetIdentityFromCredentialStore, validateIdentityRecords } from "../../../commons/validate-records.js";
import { CredentialStoreError, StoredIdentityValidationError } from "../../../commons/errors.js";
import { HttpCodesEnum } from "../../../commons/constants.js";
import { getSessionDetails } from "../../../services/oauth-internal-service.js";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import * as identityExpiryService from "../../../identity-reuse/identity-expiry-service.js";
import * as calculateVotModule from "../../../identity-reuse/calculate-vot.js";
import * as validateRecords from "../../../commons/validate-records.js";
import * as credentialStore from "../../../credential-store/encrypted-credential-store.js";
import * as configuration from "../../../commons/configuration.js";
import * as jwtUtilities from "../../../commons/jwt-utilities.js";
import { CredentialStoreIdentityResponse } from "../../../credential-store/credential-store-identity-response.js";

const mockRender = vi.hoisted(() => vi.fn().mockReturnValue("Rendered Confirm Details Screen"));

vi.mock("nunjucks", () => ({
  default: {
    configure: vi.fn(() => ({
      render: mockRender,
      addFilter: vi.fn(),
    })),
  },
}));

vitest.mock("../../../commons/logger");
vitest.mock("@aws-lambda-powertools/metrics", () => ({
  Metrics: class {
    addDimensions = vi.fn();
    addMetric = vi.fn();
    publishStoredMetrics = vi.fn();
  },
}));

vi.mock("../../../commons/validate-records", () => ({
  handleGetIdentityFromCredentialStore: vi.fn(),
  validateIdentityRecords: vi.fn(),
}));

vi.mock("../user-details-content", () => ({
  extractUserDetails: vi.fn().mockReturnValue({
    name: "Jane Doe",
    dateOfBirth: "1990-01-15",
    addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
  }),
}));

vi.mock("../../../services/oauth-internal-service", () => ({
  getSessionDetails: vi.fn().mockResolvedValue({
    storageAccessToken: "mock-storage-access-token",
    subject: "user-sub",
    vtr: ["P2"],
  }),
}));

vi.mock("../../../commons/cookie-utilities", () => ({
  getCookieValues: vi.fn().mockReturnValue(new Map([["identity_reuse_service_session", "test-session-id"]])),
}));

process.env.DOMAIN_NAME = "test-domain";

const mockIdentityResponse: CredentialStoreIdentityResponse = {
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
  vi.spyOn(validateRecords, "handleGetIdentityFromCredentialStore").mockResolvedValue(mockIdentityResponse);
  vi.spyOn(validateRecords, "validateIdentityRecords").mockResolvedValue({
    kidValid: true,
    signatureValid: true,
    isValid: true,
    storedIdentityJwt: {
      sub: "user-sub",
      credentials: [],
      vot: "P2",
      vtm: "https://oidc.account.gov.uk/trustmark",
      claims: {
        "https://vocab.account.gov.uk/v1/coreIdentity": {},
        "https://vocab.account.gov.uk/v1/address": [],
      },
    },
  });
  vi.spyOn(configuration, "getConfiguration").mockResolvedValue({
    evcsApiUrl: "https://evcs.gov.uk",
    controllerAllowList: [],
    fraudIssuer: ["fraudCRI"],
    fraudValidityPeriod: 180,
  } as never);
  vi.spyOn(credentialStore, "parseCurrentVerifiableCredentials").mockReturnValue([]);
  vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
    fraudExpired: false,
    drivingLicenceExpired: false,
    expired: false,
  });
  vi.spyOn(jwtUtilities, "getJwtBody").mockReturnValue({ sub: "user-sub", vot: "P2", max_vot: "P2" } as never);
  vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P2");
});

afterEach(() => {
  vitest.clearAllMocks();
});

it("should render the confirm details screen when all query string parameters are provided", async () => {
  (validateIdentityRecords as Mock).mockResolvedValue({
    kidValid: true,
    signatureValid: true,
    isValid: true,
    storedIdentityJwt: {
      sub: "user-sub",
      credentials: [],
      vot: "P2",
      vtm: "https://oidc.account.gov.uk/trustmark",
      claims: {},
    },
  });
  const result = await lambdaHandler(validEvent());

  expect(getSessionDetails).toHaveBeenCalledWith("test-session-id");
  expect(handleGetIdentityFromCredentialStore).toHaveBeenCalledWith("Bearer mock-storage-access-token", "user-sub");
  expect(mockRender).toHaveBeenCalledExactlyOnceWith(
    expect.toSatisfy((filename: string) => filename.endsWith("index.njk")),
    {
      assetPath: "./assets",
      redirect_uri: "https://example.com",
      state: "state-id",
      rootPath: ".",
      client_id: "client",
      govukRebrand: true,
      userDetails: {
        name: "Jane Doe",
        dateOfBirth: "1990-01-15",
        addressDetailHtml: "10 Downing Street<br>London<br>SW1A 2AA",
      },
      translations,
      errorPageUrl: "https://test-domain/error/unrecoverable",
    }
  );

  expect(result).toEqual({
    body: "Rendered Confirm Details Screen",
    headers: {
      "content-type": "text/html",
    },
    statusCode: 200,
  });
});

it("should return an error when some required query string parameters are missing", async () => {
  await expect(
    lambdaHandler({
      queryStringParameters: {
        code: "1234",
        state: "state-id",
      },
    } as never as APIGatewayProxyEvent)
  ).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined or empty",
  });
});

it("should return an error when some required query string parameters are empty", async () => {
  await expect(
    lambdaHandler({
      queryStringParameters: {
        redirect_uri: "",
        code: "2468",
        state: "",
      },
    } as never as APIGatewayProxyEvent)
  ).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined or empty",
  });
});

describe("handler record validation", () => {
  it("renders confirm-details page when all records are valid and validated", async () => {
    (validateIdentityRecords as Mock).mockResolvedValue({
      kidValid: true,
      signatureValid: true,
      isValid: true,
      storedIdentityJwt: {
        sub: "user-sub",
        credentials: [],
        vot: "P2",
        vtm: "https://oidc.account.gov.uk/trustmark",
        claims: {},
      },
    });
    const result = await lambdaHandler(validEvent());
    expect(mockRender).toHaveBeenCalledWith(expect.stringContaining("index.njk"), expect.any(Object));
    expect(result.statusCode).toBe(200);
  });

  it.each([
    { kidValid: false, signatureValid: true, isValid: true },
    { kidValid: false, signatureValid: false, isValid: true },
    { kidValid: false, signatureValid: true, isValid: false },
  ])("returns failure response when validation fails (%o)", async (verdict) => {
    (validateIdentityRecords as Mock).mockResolvedValue(verdict);
    const result = await lambdaHandler(validEvent());
    expect(result).toEqual({ statusCode: 500, body: "" });
  });

  it("returns an error when session cookie is missing", async () => {
    const { getCookieValues } = await import("../../../commons/cookie-utilities.js");
    (getCookieValues as Mock).mockReturnValueOnce(new Map());
    const result = await lambdaHandler({
      queryStringParameters: { redirect_uri: "test.com", state: "state", client_id: "client_id" },
      headers: {},
    } as never as APIGatewayProxyEvent);
    expect(getSessionDetails).not.toHaveBeenCalled();
    expect(handleGetIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });

  it("returns a failure response with a 500 status code when storageAccessToken is not returned from the session", async () => {
    (getSessionDetails as Mock).mockResolvedValueOnce({ subject: "user-sub", storageAccessToken: undefined });
    const result = await lambdaHandler(validEvent());
    expect(handleGetIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });

  it("returns a failure response when the EVCS call fails", async () => {
    (handleGetIdentityFromCredentialStore as Mock).mockRejectedValue(
      new CredentialStoreError(HttpCodesEnum.INTERNAL_SERVER_ERROR, "user-id")
    );
    const result = await lambdaHandler(validEvent());
    expect(validateIdentityRecords).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 500, body: "" });
  });

  it("redirects to error page when EVCS returns a 404", async () => {
    (handleGetIdentityFromCredentialStore as Mock).mockRejectedValue(
      new CredentialStoreError(HttpCodesEnum.NOT_FOUND, "user-id")
    );
    const result = await lambdaHandler(validEvent());
    expect(validateIdentityRecords).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });

  it("returns a failure response when getSessionDetails throws", async () => {
    (getSessionDetails as Mock).mockRejectedValueOnce(new Error("GET session endpoint returned an error response"));
    const result = await lambdaHandler(validEvent());
    expect(handleGetIdentityFromCredentialStore).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({ statusCode: 500, body: "" });
  });

  it("redirects to error page when stored identity JWT validation fails", async () => {
    (validateIdentityRecords as Mock).mockRejectedValue(new StoredIdentityValidationError());
    const result = await lambdaHandler(validEvent());
    expect(mockRender).not.toHaveBeenCalled();
    expect(result).toEqual({
      statusCode: 302,
      headers: { Location: "https://test-domain/error/unrecoverable" },
      body: "",
    });
  });
});

describe("combined expiry and VoT checks", () => {
  it("should redirect when both identity is expired and VoT is insufficient", async () => {
    vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P0");

    const result = await lambdaHandler(validEvent());

    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
    });
  });

  it("should redirect when only fraud check is expired but VoT is sufficient", async () => {
    vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: false,
      expired: true,
    });
    vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P2");

    const result = await lambdaHandler(validEvent());

    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
    });
  });

  it("should redirect when only driving licence is expired but VoT is sufficient", async () => {
    vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P2");

    const result = await lambdaHandler(validEvent());

    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
    });
  });

  it("should redirect when only VoT is insufficient but identity is not expired", async () => {
    vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P0");

    const result = await lambdaHandler(validEvent());

    expect(result).toEqual({
      statusCode: 302,
      body: "",
      headers: {
        Location: "https://test-domain/error/unrecoverable",
      },
    });
  });

  it("should render confirm details page when neither check fails", async () => {
    vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P2");

    const result = await lambdaHandler(validEvent());

    expect(result.statusCode).toBe(200);
    expect(mockRender).toHaveBeenCalled();
  });

  it("should always execute both checks before failing", async () => {
    const hasIdentityExpiredSpy = vi.spyOn(identityExpiryService, "hasIdentityExpired").mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    const calculateVotSpy = vi.spyOn(calculateVotModule, "calculateVot").mockReturnValue("P0");

    await lambdaHandler(validEvent());

    expect(hasIdentityExpiredSpy).toHaveBeenCalled();
    expect(calculateVotSpy).toHaveBeenCalled();
  });
});
