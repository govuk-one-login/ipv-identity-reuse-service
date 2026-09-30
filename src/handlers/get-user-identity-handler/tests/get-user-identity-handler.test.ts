import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEventBase, Context } from "aws-lambda";
import { handler } from "../get-user-identity-handler.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizerContext } from "../../api-gateway-protected-resource-authorizer-handler/api-gateway-protected-resource-authorizer-types.js";
import { getSessionDetails, GetSessionSuccessResponse } from "../../../api/oauth-internal-api.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import {
  getSignedStoredIdentity,
  getStoredIdentityRecordBody,
} from "../../../domain/stored-identity/stored-identity-validator.js";
import { validateStoredIdentityAndVotByHash } from "../../../domain/stored-identity/stored-identity-hashing.js";
import {
  SignedStoredIdentity,
  StoredIdentityClaims,
  StoredIdentityRecord,
} from "../../../domain/stored-identity/stored-identity-types.js";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";
import { KENNETH_DECERQUEIRA_PASSPORT } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/passports";
import { KENNETH_DECERQUEIRA_DVLA_DRIVING_PERMIT } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/drivinglicenses";
import {
  GetSessionError,
  StoredIdentityHashMismatchError,
  StoredIdentityValidationError,
  UserIdentityError,
} from "../../../commons/errors.js";
import { APIGatewayAuthorizerResultContext } from "aws-lambda/common/api-gateway.js";
import logger from "../../../commons/logger.js";

vi.mock("../../../api/oauth-internal-api.js", () => ({
  getSessionDetails: vi.fn(),
}));

vi.mock("../../../domain/stored-identity/stored-identity-validator.js", () => ({
  getSignedStoredIdentity: vi.fn(),
  getStoredIdentityRecordBody: vi.fn(),
}));

vi.mock("../../../domain/stored-identity/stored-identity-hashing.js", () => ({
  validateStoredIdentityAndVotByHash: vi.fn(),
}));

vi.mock("../../../commons/logger.js");

beforeEach(() => {
  vi.resetAllMocks();
});

describe("Successful user-identity response", () => {
  it.each(["P1", "P2", "P3"])("should contain the vot returned from session: %s", async (sessionVot: string) => {
    mockSessionData(sessionVot, "hash123", "evcsAccessToken");

    const signedIdentityData = {
      signedStoredIdentityRecord: "header1.payload1.signature1",
      signedCredentials: ["header2.payload2.signature2", "header3.payload3.signature3"],
    };
    mockSignedIdentityData(signedIdentityData);

    const storedIdentityRecord: StoredIdentityRecord = createStoredIdentityRecord();
    mockStoredIdentityRecord(storedIdentityRecord);

    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { sessionId: "session123" } },
    } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);
    const response = await handler(request, {} as Context);

    expect(getSessionDetails).toHaveBeenCalledWith("session123");
    expect(validateStoredIdentityAndVotByHash).toHaveBeenCalledWith(signedIdentityData, sessionVot, "hash123");
    expect(getStoredIdentityRecordBody).toHaveBeenCalledWith("header1.payload1.signature1");
    expect(response).toStrictEqual({
      statusCode: 200,
      body: JSON.stringify({
        sub: storedIdentityRecord.sub,
        vot: sessionVot,
        vtm: "https://oidc.account.gov.uk/trustmark",
        "https://vocab.account.gov.uk/v1/credentialJWT": signedIdentityData.signedCredentials,
        "https://vocab.account.gov.uk/v1/returnCode": [],
        ...storedIdentityRecord.claims,
      }),
    });
  });

  it.each([
    [
      "https://vocab.account.gov.uk/v1/passport",
      { "https://vocab.account.gov.uk/v1/passport": [KENNETH_DECERQUEIRA_PASSPORT] },
    ],
    [
      "https://vocab.account.gov.uk/v1/drivingPermit",
      { "https://vocab.account.gov.uk/v1/drivingPermit": [KENNETH_DECERQUEIRA_DVLA_DRIVING_PERMIT] },
    ],
  ])(
    "should contain the %s claim if present in the stored identity record",
    async (claimName: string, claim: Partial<StoredIdentityClaims>) => {
      mockSessionData("P2", "hash123", "evcsAccessToken");

      const signedIdentityData = {
        signedStoredIdentityRecord: "header1.payload1.signature1",
        signedCredentials: ["header2.payload2.signature2", "header3.payload3.signature3"],
      };
      mockSignedIdentityData(signedIdentityData);

      const storedIdentityRecord: StoredIdentityRecord = createStoredIdentityRecord(claim);
      mockStoredIdentityRecord(storedIdentityRecord);

      const request = createMockAPIGatewayProxyEvent({
        requestContext: { authorizer: { sessionId: "session123" } },
      } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);
      const response = await handler(request, {} as Context);

      expect(getSessionDetails).toHaveBeenCalledWith("session123");
      expect(validateStoredIdentityAndVotByHash).toHaveBeenCalledWith(signedIdentityData, "P2", "hash123");
      expect(getStoredIdentityRecordBody).toHaveBeenCalledWith("header1.payload1.signature1");
      expect(response).toStrictEqual({
        statusCode: 200,
        body: JSON.stringify({
          sub: storedIdentityRecord.sub,
          vot: "P2",
          vtm: "https://oidc.account.gov.uk/trustmark",
          "https://vocab.account.gov.uk/v1/credentialJWT": signedIdentityData.signedCredentials,
          "https://vocab.account.gov.uk/v1/returnCode": [],
          ...storedIdentityRecord.claims,
        }),
      });
      expect((JSON.parse(response.body) as Record<string, unknown>)[claimName]).toBeTruthy();
    }
  );
});

describe("User-identity errors", () => {
  it("should return a 500 if sessionId is not present on authorizer context", async () => {
    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { something: "session123" } as APIGatewayAuthorizerResultContext },
    } as Partial<APIGatewayProxyEventBase<APIGatewayAuthorizerResultContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({
      statusCode: 500,
      body: JSON.stringify({ message: "No sessionId found in authorizer context" }),
    });
    expect(logger.error).toHaveBeenCalledWith("No sessionId found in authorizer context");
  });

  it("should return a 500 if sessionId is not a string", async () => {
    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { something: 100 } as APIGatewayAuthorizerResultContext },
    } as Partial<APIGatewayProxyEventBase<APIGatewayAuthorizerResultContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({
      statusCode: 500,
      body: JSON.stringify({ message: "No sessionId found in authorizer context" }),
    });
    expect(logger.error).toHaveBeenCalledWith("No sessionId found in authorizer context");
  });

  it("should return a 500 when getting session data throws a GetSessionError", async () => {
    const error = new GetSessionError("I am an error");
    vi.mocked(getSessionDetails).mockThrow(error);

    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { sessionId: "session123" } },
    } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({ statusCode: 500, body: JSON.stringify({ message: "I am an error" }) });
    expect(logger.error).toHaveBeenCalledWith("Error met when creating user identity", { cause: error });
  });

  it.each([
    ["P2", "hash123", undefined, "Unable to fetch EVCS access token from session"],
    ["P2", undefined, "accessToken", "Unable to fetch storedIdentitySha256 from session"],
    [undefined, "hash123", "accessToken", "Unable to fetch calculated vot from session"],
  ])(
    "should return a 500 if session does not contain storageAccessToken",
    async (
      vot: string | undefined,
      identityHash: string | undefined,
      storageAccessToken: string | undefined,
      errorMessage: string
    ) => {
      mockSessionData(vot, identityHash, storageAccessToken);

      const request = createMockAPIGatewayProxyEvent({
        requestContext: { authorizer: { sessionId: "session123" } },
      } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);

      const response = await handler(request, {} as Context);
      expect(response).toStrictEqual({
        statusCode: 500,
        body: JSON.stringify({ message: errorMessage }),
      });
      expect(logger.error).toHaveBeenCalledWith("Error met when creating user identity", {
        cause: new UserIdentityError(errorMessage),
      });
    }
  );

  it("should return a 500 when there is no identity in EVCS", async () => {
    mockSessionData("P2", "hash123", "evcsAccessToken");
    // eslint-disable-next-line unicorn/no-useless-undefined
    mockSignedIdentityData(undefined);

    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { sessionId: "session123" } },
    } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({
      statusCode: 500,
      body: JSON.stringify({ message: "Stored identity not found in EVCS" }),
    });
    expect(logger.error).toHaveBeenCalledWith("Error met when creating user identity", {
      cause: new UserIdentityError("Stored identity not found in EVCS"),
    });
  });

  it("should return a 500 when hash validation fails", async () => {
    mockSessionData("P2", "hash123", "evcsAccessToken");

    const signedIdentityData = {
      signedStoredIdentityRecord: "header1.payload1.signature1",
      signedCredentials: ["header2.payload2.signature2", "header3.payload3.signature3"],
    };
    mockSignedIdentityData(signedIdentityData);

    const error = new StoredIdentityHashMismatchError("I am an error");
    vi.mocked(validateStoredIdentityAndVotByHash).mockThrow(error);

    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { sessionId: "session123" } },
    } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({
      statusCode: 500,
      body: JSON.stringify({ message: "I am an error" }),
    });
    expect(logger.error).toHaveBeenCalledWith("Error met when creating user identity", {
      cause: error,
    });
  });

  it("should throw a 500 when JWT body is not a stored identity record", async () => {
    mockSessionData("P2", "hash123", "evcsAccessToken");

    const signedIdentityData = {
      signedStoredIdentityRecord: "header1.payload1.signature1",
      signedCredentials: ["header2.payload2.signature2", "header3.payload3.signature3"],
    };
    mockSignedIdentityData(signedIdentityData);

    const error = new StoredIdentityValidationError("I am an error");
    vi.mocked(getStoredIdentityRecordBody).mockThrow(error);

    const request = createMockAPIGatewayProxyEvent({
      requestContext: { authorizer: { sessionId: "session123" } },
    } as Partial<APIGatewayProxyEventBase<AuthorizerContext>>);

    const response = await handler(request, {} as Context);
    expect(response).toStrictEqual({
      statusCode: 500,
      body: JSON.stringify({ message: "I am an error" }),
    });
    expect(logger.error).toHaveBeenCalledWith("Error met when creating user identity", {
      cause: error,
    });
  });
});

const mockSessionData = (
  sessionVot: string | undefined,
  sessionIdentityHash: string | undefined,
  sessionStorageAccessToken?: string
): void => {
  vi.mocked(getSessionDetails).mockResolvedValue({
    ...(sessionStorageAccessToken ? { storageAccessToken: sessionStorageAccessToken } : {}),
    sessionData: {
      storedIdentitySha256: sessionIdentityHash,
      vot: sessionVot as IdentityVectorOfTrust,
    },
  } as GetSessionSuccessResponse);
};

const mockSignedIdentityData = (signedStoredIdentity: SignedStoredIdentity | undefined): void => {
  vi.mocked(getSignedStoredIdentity).mockResolvedValue(signedStoredIdentity);
};

const mockStoredIdentityRecord = (storedIdentityRecord: StoredIdentityRecord): void => {
  vi.mocked(getStoredIdentityRecordBody).mockReturnValue(storedIdentityRecord);
};

const createMockAPIGatewayProxyEvent = (
  event?: Partial<APIGatewayProxyEventBase<APIGatewayAuthorizerResultContext>>
): APIGatewayProxyEventBase<APIGatewayAuthorizerResultContext> => ({
  // eslint-disable-next-line unicorn/no-null -- Required to create value APIGatewayProxyEvent object
  body: null,
  headers: {},
  multiValueHeaders: {},
  httpMethod: "GET",
  isBase64Encoded: false,
  path: "/",
  // eslint-disable-next-line unicorn/no-null -- Required to create value APIGatewayProxyEvent object
  pathParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create value APIGatewayProxyEvent object
  queryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create value APIGatewayProxyEvent object
  multiValueQueryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create value APIGatewayProxyEvent object
  stageVariables: null,
  requestContext: {
    authorizer: { sessionId: "session123" } as APIGatewayAuthorizerResultContext,
  } as APIGatewayEventRequestContextWithAuthorizer<APIGatewayAuthorizerResultContext>,
  resource: "/",
  ...event,
});

const createStoredIdentityRecord = (claims?: Partial<StoredIdentityClaims>): StoredIdentityRecord => {
  const storedIdentityClaims: StoredIdentityClaims = {
    "https://vocab.account.gov.uk/v1/coreIdentity": {
      name: [KENNETH_DECERQUEIRA],
      birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
    },
    "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
    ...claims,
  };
  return {
    iss: "issuer",
    nbf: 1234,
    aud: "sis",
    sub: "urn:fdc:gov.uk:2022:TEST_USER-7B96ScRg2a-k7fN-u-sZbEjbB3hQ6gf6SM0x",
    max_vot: "P3",
    vot: "P1",
    credentials: ["header2", "header3"],
    claims: storedIdentityClaims,
  };
};
