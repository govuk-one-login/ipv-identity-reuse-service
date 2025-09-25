import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { HttpCodesEnum } from "../../../commons/constants";
import { Configuration } from "../../../commons/configuration";
import * as configuration from "../../../commons/configuration";
import { CredentialStoreIdentityResponse } from "../../../credential-store/credential-store-identity-response";
import { UserIdentityResponseMetadata } from "../user-identity-response-metadata";
import { UserIdentityRequest } from "../user-identity-request";
import * as fraudCheckService from "../../../identity-reuse/fraud-check-service";
import * as storedIdentityValidator from "../../../identity-reuse/stored-identity-validator";
import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";

import * as AuditModule from "../../../commons/audit";
import * as DidResolutionService from "../../../identity-reuse/did-resolution-service";
import { TxmaEvent } from "../../../commons/audit-events";
import { SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { decodeJwt, JWTHeaderParameters } from "jose";
import { getJwtSignature } from "../../../commons/jwt-utils";
import { publicKeyJwk, getDefaultStoredIdentityHeader, sign } from "../../../../shared-test/jwt-utils";

const CURRENT = "CURRENT";
const HISTORIC = "HISTORIC";
const TEST_USER = "urn:fdc:gov.uk:2022:TEST_USER-S7jcrHLGBj-2kgB-8-cYhVrMdo3CV0LlD7An";
const FRAUD_ISSUER = "fraudCRI";
const PASSPORT_ISSUER = "passportCRI";

const TEST_FRAUD_VALIDITY_HOURS: number = 4320; // ~6 months

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

const ALLOWED_CONTROLLER = "api.identity.dev.account.gov.uk";

beforeEach(() => {
  jest.useFakeTimers({ now: 1759240815925 });
  jest.clearAllMocks();
  newEvent = event();
  jest.spyOn(configuration, "getServiceApiKey").mockResolvedValue("an-api-key");
  jest.spyOn(configuration, "getConfiguration").mockResolvedValue({
    evcsApiUrl: "https://evcs.gov.uk",
    controllerAllowList: [ALLOWED_CONTROLLER],
    fraudIssuer: [FRAUD_ISSUER],
    fraudValidityPeriod: TEST_FRAUD_VALIDITY_HOURS,
  } as Configuration);
  jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockRestore();
  jest.spyOn(storedIdentityValidator, "validateStoredIdentityCredentials").mockRestore();
  jest.spyOn(DidResolutionService, "getPublicKeyJwkForKid").mockResolvedValue(publicKeyJwk);
  jest.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(true);
  jest.spyOn(DidResolutionService, "getDidWebController").mockReturnValue(ALLOWED_CONTROLLER);
  mockSendTxmaEvent = jest.spyOn(AuditModule, "sendAuditMessage").mockResolvedValue({ $metadata: {} });
});

describe("user-identity-handler authorization", () => {
  beforeEach(() => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    jest.spyOn(storedIdentityValidator, "validateStoredIdentityCredentials").mockReturnValue(true);
  });

  it("should return Success, given a valid bearer token", async () => {
    const { mockEVCSData, credentialSignatures } = await createCredentialStoreIdentityResponse([
      await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER),
      await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER),
    ]);
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [], credentials: credentialSignatures },
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
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_RETURNED",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        response_outcome: "returned",
        is_valid: true,
        expired: false,
        vot: "P2",
      },
      restricted: {
        response_body: JSON.stringify({
          content: decodeJwt(mockEVCSData.si.vc),
          vot: "P2",
          isValid: true,
          expired: false,
          kidValid: true,
          signatureValid: true,
        }),
      },
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });

  it("signatureValid should be false, given signature validation fails", async () => {
    const misSignedStoredIdentity =
      "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDp3ZWI6YXBpLmlkZW50aXR5LmRldi5hY2NvdW50Lmdvdi51ayNmNWZlNWQyYS05ZWI2LTQ4MTktOGM0Ni03MjNlM2EyMTU2NWEifQ.eyJzdWIiOiJ1c2VyLXN1YiIsInZvdCI6IlAyIiwidnRtIjpbXX0.-jy9iwsn6uDzr6b3mk0JJZ4NdUf8z3O3ldBbbXKAAtxMH3TIMlBm5u2bI4I1qHrWk1BL2k8muKLV-VIUeych1A";
    const { mockEVCSData } = await createCredentialStoreIdentityResponse([], getDefaultStoredIdentityHeader());
    mockEVCSData.si.vc = misSignedStoredIdentity;
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
      signatureValid: false,
    });
  });

  it("kidValid should be false, given an invalid kid claim", async () => {
    jest.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(false);
    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      [],
      getDefaultStoredIdentityHeader("ES256", "did:invalid-did")
    );
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [] },
      expired: false,
      isValid: true,
      kidValid: false,
      signatureValid: false,
    });
  });

  it("kidValid should be false, given non allow listed did controller header", async () => {
    jest.spyOn(DidResolutionService, "isValidDidWeb").mockReturnValue(true);
    jest.spyOn(DidResolutionService, "getDidWebController").mockReturnValue("DISALLOWED.CONTROLLER");

    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      [],
      getDefaultStoredIdentityHeader("ES256", "did:web:DISALLOWED.CONTROLLER#f5fe5d2a-9eb6-4819-8c46-723e3a21565a")
    );
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [] },
      expired: false,
      isValid: true,
      kidValid: false,
      signatureValid: false,
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
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_RETURNED",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        response_outcome: "error",
        error_code: "forbidden",
      },
      restricted: {
        response_body: '{"error":"forbidden","error_description":"Access token expired or not permitted"}',
      },
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
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_RETURNED",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        response_outcome: "error",
        error_code: "authentication_failure",
      },
      restricted: {
        response_body: '{"error":"invalid_token","error_description":"Bearer token is missing or invalid"}',
      },
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
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_RETURNED",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        response_outcome: "error",
        error_code: "service_error",
      },
      restricted: {
        response_body: '{"error":"server_error","error_description":"Unable to retrieve data"}',
      },
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
    expect(mockSendTxmaEvent).toHaveBeenCalledWith({
      component_id: "https://identity.local.account.gov.uk/sis",
      event_name: "SIS_STORED_IDENTITY_RETURNED",
      event_timestamp_ms: 1759240815925,
      timestamp: 1759240815,
      extensions: {
        response_outcome: "error",
        error_code: "no_record",
      },
      restricted: {
        response_body:
          '{"error":"not_found","error_description":"No Stored Identity exists for this user or Stored Identity has been invalidated"}',
      },
      user: {
        user_id: TEST_USER,
        govuk_signin_journey_id: "govuk_signin_journey_id",
      },
    });
  });
});

describe("user-identity-handler expired", () => {
  const NOW: string = "2025-08-24T15:35:58.000Z";
  const NOT_EXPIRED_NBF: string = "2025-05-15T16:30:04.000Z";
  const EXPIRED_NBF: string = "2025-01-12T10:02:54.000Z";
  const RANDOM_NBF: string = "2023-04-25T15:01:36.000Z";

  beforeEach(() => {
    jest.spyOn(storedIdentityValidator, "validateStoredIdentityCredentials").mockReturnValue(true);
    jest.clearAllMocks();
    newEvent = event();
    jest.spyOn(configuration, "getServiceApiKey").mockResolvedValue("an-api-key");
    jest.spyOn(configuration, "getConfiguration").mockResolvedValue({
      evcsApiUrl: "https://evcs.gov.uk",
      controllerAllowList: [ALLOWED_CONTROLLER],
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
    const fraudChecks = await Promise.all(
      fraudCheckInputs.map(async (input) => {
        return { signedVc: await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER, input.nbf), state: input.state };
      })
    );
    const passportCheck = await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER, RANDOM_NBF);

    const { mockEVCSData, credentialSignatures } = await createCredentialStoreIdentityResponseWithStates([
      ...fraudChecks,
      { signedVc: passportCheck, state: CURRENT },
    ]);
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [], credentials: credentialSignatures },
      expired: expectedExpired,
      isValid: true,
      kidValid: true,
      signatureValid: true,
    });
  });
});

describe("user-identity-handler isValid", () => {
  beforeEach(() => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
  });

  it("should set isValid to false if stored identity record is missing credential signature", async () => {
    const passportCredential = await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER);
    const fraudCredential = await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER);
    const fraudCredentialSignature = getJwtSignature(fraudCredential)!;

    const credentials = [passportCredential, fraudCredential];
    const credentialSignaturesMissingOne = [fraudCredentialSignature];

    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      credentials,
      getDefaultStoredIdentityHeader(),
      credentialSignaturesMissingOne
    );
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [], credentials: credentialSignaturesMissingOne },
      expired: false,
      isValid: false,
      kidValid: true,
      signatureValid: true,
    });
  });

  it("should set isValid to false if stored identity record contains extra credential signature", async () => {
    const passportCredential = await createSignedIdentityCheckCredentialJWT(PASSPORT_ISSUER);
    const fraudCredential = await createSignedIdentityCheckCredentialJWT(FRAUD_ISSUER);
    const fraudCredentialSignature = fraudCredential.split(".").at(2)!;
    const passportCredentialSignature = passportCredential.split(".").at(2)!;

    const credentials = [passportCredential];
    const credentialSignaturesExtraOne = [passportCredentialSignature, fraudCredentialSignature];

    const { mockEVCSData } = await createCredentialStoreIdentityResponse(
      credentials,
      getDefaultStoredIdentityHeader(),
      credentialSignaturesExtraOne
    );
    mockEVCSResponse(mockEVCSData);

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body).toStrictEqual({
      vot: "P2",
      content: { sub: "user-sub", vot: "P2", vtm: [], credentials: credentialSignaturesExtraOne },
      expired: false,
      isValid: false,
      kidValid: true,
      signatureValid: true,
    });
  });
});

type StoredIdentityResponse = {
  mockEVCSData: CredentialStoreIdentityResponse;
  credentialSignatures: string[];
};

const createCredentialStoreIdentityResponse = async (
  signedVcs: string[],
  header: JWTHeaderParameters = getDefaultStoredIdentityHeader(),
  forcedCredentialSignatures?: string[]
): Promise<StoredIdentityResponse> => {
  const vcsAndStates = signedVcs.map((vc) => {
    return { signedVc: vc, state: CURRENT };
  });
  return await createCredentialStoreIdentityResponseWithStates(vcsAndStates, header, forcedCredentialSignatures);
};

const createCredentialStoreIdentityResponseWithStates = async (
  credentialsAndStates: { signedVc: string; state: string }[],
  header: JWTHeaderParameters = getDefaultStoredIdentityHeader(),
  forcedCredentialSignatures?: string[]
): Promise<StoredIdentityResponse> => {
  const evcsVcs = credentialsAndStates.map((vcState) => {
    return { state: vcState.state, vc: vcState.signedVc, metadata: null };
  });

  const credentialSignatures =
    forcedCredentialSignatures ?? credentialsAndStates.map((credential) => credential.signedVc.split(".").at(2)!);
  const storedIdentity = createStoredIdentityRecord(...credentialSignatures);

  const response: CredentialStoreIdentityResponse = {
    si: {
      state: CURRENT,
      vc: await sign(header, storedIdentity),
      metadata: null,
    },
    vcs: evcsVcs,
  };

  return { mockEVCSData: response, credentialSignatures: credentialSignatures };
};

const createStoredIdentityRecord = (...credentialSignatures: string[]) => {
  const storedIdentityRecord = {
    sub: "user-sub",
    vot: "P2",
    vtm: [],
  };

  return credentialSignatures?.length
    ? { ...storedIdentityRecord, credentials: credentialSignatures }
    : storedIdentityRecord;
};

const createSignedIdentityCheckCredentialJWT = async (issuer: string, nbfDate?: string): Promise<string> => {
  const nbfSeconds = Math.floor((nbfDate ? new Date(nbfDate).getTime() : Date.now()) / 1000);
  const credential: IdentityCheckCredentialJWTClass = {
    iss: issuer,
    nbf: nbfSeconds,
    sub: "sdf",
    vc: {
      evidence: [{}],
      type: ["VerifiableCredential", "IdentityCheckCredential"],
    },
  };
  return await sign(getDefaultStoredIdentityHeader(), credential);
};
