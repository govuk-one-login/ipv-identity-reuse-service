import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { HttpCodesEnum } from "../../../commons/constants";
import { Configuration } from "../../../commons/configuration";
import * as configuration from "../../../commons/configuration";
import { CredentialStoreIdentityResponse } from "../../../credential-store/credential-store-identity-response";
import { UserIdentityResponseMetadata } from "../user-identity-response-metadata";
import { UserIdentityRequest } from "../user-identity-request";
import * as fraudCheckService from "../../../identity-reuse/fraud-check-service";
import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { VerifiableCredentialJWT } from "../../../identity-reuse/verifiable-credential-jwt";
import { getDefaultStoredIdentityHeader, sign } from "../../../../tests/acceptance/steps/utils/jwt-utils";

const CURRENT = "CURRENT";
const HISTORIC = "HISTORIC";
import * as AuditModule from "../../../commons/audit";
import { TxmaEvent } from "../../../commons/audit-events";
import { SendMessageCommandOutput } from "@aws-sdk/client-sqs";

const TEST_USER = "urn:fdc:gov.uk:2022:TEST_USER-S7jcrHLGBj-2kgB-8-cYhVrMdo3CV0LlD7An";

const event = () => {
  return {
    headers: {
      accept: "*/*",
      Host: "stack-name.credential-store.dev.account.gov.uk",
      "X-Amzn-Trace-Id": "Root=1-666bf197-43c06e88748f092a5cc812a9",
      "x-api-key": "a-pretend-api-key-value",
      "X-Forwarded-For": "123.123.123.123",
      "X-Forwarded-Port": "443",
      "X-Forwarded-Proto": "https",
      Authorization:
        "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImVjS2lkMTIzIn0.eyJzdWIiOiJ1cm46ZmRjOmdvdi51azoyMDIyOlRFU1RfVVNFUi1TN2pjckhMR0JqLTJrZ0ItOC1jWWhWck1kbzNDVjBMbEQ3QW4iLCJleHAiOjE3NTczMjQyMTcsImlhdCI6MTc1NzMyMzkxNywiaXNzIjoiaHR0cHM6Ly9tb2NrLmNyZWRlbnRpYWwtc3RvcmUuYnVpbGQuYWNjb3VudC5nb3YudWsvb3JjaGVzdHJhdGlvbiIsImF1ZCI6Imh0dHBzOi8vY3JlZGVudGlhbC1zdG9yZS5idWlsZC5hY2NvdW50Lmdvdi51ayIsInNjb3BlIjoicHJvdmluZyJ9.Sj-2jA6mLdfkU1ryoBCNHxpBCT49o9qfqpKPMLkKwY1D6V6SvVIERGbC0X-fh8SYk2z-strc9vahvacvkrNDUQ",
    },
    body: JSON.stringify({
      vtr: ["P2"],
      govukSigninJourneyId: "govuk_signin_journey_id",
    } satisfies UserIdentityRequest),
  } as unknown as APIGatewayProxyEvent;
};

const mockEVCSResponse = (response: CredentialStoreIdentityResponse) => {
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
    new Response(JSON.stringify(response), {
      status: 200,
      headers: { "content-type": "application/json" },
    })
  );
};

let newEvent: APIGatewayProxyEvent;
let mockSendTxmaEvent: jest.SpyInstance<
  Promise<SendMessageCommandOutput>,
  [event: TxmaEvent<string, object | undefined, object | undefined>],
  any
>;

describe("user-identity-handler authorization", () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: 1759240815925 });
    jest.clearAllMocks();
    newEvent = event();
    jest.spyOn(configuration, "getServiceApiKey").mockResolvedValue("an-api-key");
    jest
      .spyOn(configuration, "getConfiguration")
      .mockResolvedValue({ evcsApiUrl: "https://evcs.gov.uk" } as Configuration);
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);

    mockSendTxmaEvent = jest.spyOn(AuditModule, "sendAuditMessage").mockResolvedValue({ $metadata: {} });
  });

  it("should return Success, given a valid bearer token", async () => {
    const mockEVCSData: CredentialStoreIdentityResponse = createCredentialStoreIdentityResponse();
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [] },
      expired: false,
      isValid: true,
      kidValid: true,
      signatureValid: true,
    });
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_READ",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        max_vot: "P2",
        retrieval_outcome: "success",
      },
      restricted: {
        stored_identity_jwt: mockEVCSData.si.vc,
      },
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });

  it("should return Bad Request, given an invalid body", async () => {
    newEvent.body = undefined as never as string;
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.BAD_REQUEST,
      body: JSON.stringify({ error: "bad_request", error_description: "Bad request from client" }),
    });
  });

  it("should return Unauthorised given no Bearer token", async () => {
    newEvent.headers["Authorization"] = "";
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
    });
  });

  it("should return Unauthorised given the Bearer token is malformed", async () => {
    newEvent.headers["Authorization"] = "Bearer bad.bearer.token";
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
    });
  });

  it("should return 403 given EVCS API responded with Forbidden", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.FORBIDDEN,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.FORBIDDEN,
      body: JSON.stringify({ error: "forbidden", error_description: "Access token expired or not permitted" }),
    });
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_READ",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        retrieval_outcome: "service_error",
      },
      restricted: undefined,
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });

  it("should return 401 given EVCS API responded with Unauthorized", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.UNAUTHORIZED,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
    });
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_READ",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        retrieval_outcome: "service_error",
      },
      restricted: undefined,
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });

  it("should return 500 given EVCS API responded with Internal Server Error", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.INTERNAL_SERVER_ERROR,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: "server_error", error_description: "Unable to retrieve data" }),
    });
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_READ",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        retrieval_outcome: "service_error",
      },
      restricted: undefined,
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });

  it("should return 404 given EVCS API responded with Not Found", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.NOT_FOUND,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.NOT_FOUND,
      body: JSON.stringify({
        error: "not_found",
        error_description: "No Stored Identity exists for this user or Stored Identity has been invalidated",
      }),
    });
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_READ",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        retrieval_outcome: "no_record",
      },
      restricted: undefined,
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });
});

describe("user-identity-handler expired", () => {
  const TEST_FRAUD_VALIDITY_HOURS: number = 4320; // ~6 months
  const NOW: string = "2025-08-24T15:35:58.000Z";
  const NOT_EXPIRED_NBF: string = "2025-05-15T16:30:04.000Z";
  const EXPIRED_NBF: string = "2025-01-12T10:02:54.000Z";
  const RANDOM_NBF: string = "2023-04-25T15:01:36.000Z";

  const FRAUD_ISSUER = "fraudCRI";
  const PASSPORT_ISSUER = "passportCRI";

  beforeEach(() => {
    jest.clearAllMocks();
    newEvent = event();
    jest.spyOn(configuration, "getServiceApiKey").mockResolvedValue("an-api-key");
    jest
      .spyOn(configuration, "getConfiguration")
      .mockResolvedValue({ evcsApiUrl: "https://evcs.gov.uk" } as Configuration);
    jest.spyOn(configuration, "getConfiguration").mockResolvedValue({
      fraudIssuer: [FRAUD_ISSUER],
      fraudValidityPeriod: TEST_FRAUD_VALIDITY_HOURS,
    } as Configuration);
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockRestore();

    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW));
  });

  it.each([
    { fraudCheckInputs: [{ nbf: NOT_EXPIRED_NBF, state: CURRENT }], expectedExpired: false },
    { fraudCheckInputs: [{ nbf: EXPIRED_NBF, state: CURRENT }], expectedExpired: true },
    {
      fraudCheckInputs: [
        { nbf: NOT_EXPIRED_NBF, state: CURRENT },
        { nbf: EXPIRED_NBF, state: HISTORIC },
      ],
      expectedExpired: false,
    },
    {
      fraudCheckInputs: [
        { nbf: EXPIRED_NBF, state: CURRENT },
        { nbf: NOT_EXPIRED_NBF, state: HISTORIC },
      ],
      expectedExpired: true,
    },
  ])(`should set expired value based on NBF of CURRENT fraud check`, async ({ fraudCheckInputs, expectedExpired }) => {
    const fraudChecks = fraudCheckInputs.map((input) => {
      return { vc: createIdentityCheckCredentialJWT(input.nbf, FRAUD_ISSUER), state: input.state };
    });
    const passportCheck = createIdentityCheckCredentialJWT(RANDOM_NBF, PASSPORT_ISSUER);

    const mockCredentialStoreData = createCredentialStoreIdentityResponse([
      ...fraudChecks,
      { vc: passportCheck, state: CURRENT },
    ]);
    mockEVCSResponse(mockCredentialStoreData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [] },
      expired: expectedExpired,
      isValid: true,
      kidValid: true,
      signatureValid: true,
    });
  });
});

const createCredentialStoreIdentityResponse = (
  verifiableCredentialStates: { vc: VerifiableCredentialJWT; state: string }[] = []
): CredentialStoreIdentityResponse => {
  const storedIdentity = {
    sub: "user-sub",
    vot: "P2",
    vtm: [],
  };

  return {
    si: {
      state: CURRENT,
      vc: sign(getDefaultStoredIdentityHeader(), storedIdentity),
      metadata: null,
    },
    vcs: verifiableCredentialStates.map((vcState) => {
      return { state: vcState.state, vc: sign(getDefaultStoredIdentityHeader(), vcState.vc), metadata: null };
    }),
  };
};

const createIdentityCheckCredentialJWT = (nbfDate: string, issuer: string): IdentityCheckCredentialJWTClass => {
  const nbfSeconds = getDateSeconds(new Date(nbfDate));
  return {
    iss: issuer,
    nbf: nbfSeconds,
    sub: "sdf",
    vc: {
      evidence: [{}],
      type: ["VerifiableCredential", "IdentityCheckCredential"],
    },
  };
};

const getDateSeconds = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};
