import { APIGatewayProxyEvent, Context } from "aws-lambda";
import { handler } from "../user-identity-handler";
import { HttpCodesEnum } from "../../../commons/constants";
import { Configuration } from "../../../commons/configuration";
import * as configuration from "../../../commons/configuration";
import { CredentialStoreIdentityResponse } from "../../../credential-store/credential-store-identity-response";
import { UserIdentityResponseMetadata } from "../user-identity-response-metadata";
import { UserIdentityRequest } from "../user-identity-request";

describe("user-identity-handler tests", () => {
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
        vtr: "P2",
        govukSigninJourneyId: "govuk_signin_journey_id",
      } satisfies UserIdentityRequest),
    } as unknown as APIGatewayProxyEvent;
  };
  let newEvent: any;

  beforeEach(() => {
    jest.clearAllMocks();
    newEvent = event();
    jest.spyOn(configuration, "getServiceApiKey").mockResolvedValue("an-api-key");
    jest
      .spyOn(configuration, "getConfiguration")
      .mockResolvedValue({ evcsApiUrl: "https://evcs.gov.uk" } as Configuration);
  });

  it("should return Success, given a valid bearer token", async () => {
    const payload: CredentialStoreIdentityResponse = {
      si: {
        state: "CURRENT",
        vc: "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiIsImtpZCI6ImU3Y2RmZWY4MjdmZmQyNzhjNmI2MDRkNGQ0MTAwZGM0In0.eyJzdWIiOiJ1c2VyLXN1YiIsInZvdCI6IlAyIiwidnRtIjpbXX0.SWzszRaCfwa3tpHChXH5YRFXvo7ZNx4WRkVU9pp-ea8iQ-UDY-Sivf9MjTJ3IWa173AO9Y0-xbasOL5qVM-3ng",
        metadata: null,
      },
      vcs: [],
    };

    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    const result = await handler(newEvent, {} as Context);

    expect(result.statusCode).toBe(HttpCodesEnum.OK);
    const body = JSON.parse(result.body) as UserIdentityResponseMetadata;
    expect(body.vot).toBe("P2");
    expect(body.content).toEqual({
      sub: "user-sub",
      vot: "P2",
      vtm: [],
    });
    expect(body.expired).toBe(false);
    expect(body.isValid).toBe(true);
    expect(body.kidValid).toBe(true);
    expect(body.signatureValid).toBe(true);
  });

  it("should return Unauthorised given no Bearer token", async () => {
    newEvent.headers["Authorization"] = "";
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
    });
  });

  it("should return Unauthorised given the Bearer token is malformed", async () => {
    newEvent.headers["Authorization"] = "Bearer bad.bearer.token";
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
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
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.FORBIDDEN,
      body: JSON.stringify({ error: "forbidden", error_description: "Access token expired or not permitted" }),
    });
  });

  it("should return 401 given EVCS API responded with Unauthorized", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.UNAUTHORIZED,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
    });
  });

  it("should return 500 given EVCS API responded with Internal Server Error", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.INTERNAL_SERVER_ERROR,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: "server_error", error_description: "Unable to retrieve data" }),
    });
  });

  it("should return 404 given EVCS API responded with Not Found", async () => {
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: HttpCodesEnum.NOT_FOUND,
        headers: { "content-type": "application/json" },
      })
    );
    const result = handler(newEvent as APIGatewayProxyEvent, {} as Context);
    await expect(result).resolves.toEqual({
      statusCode: HttpCodesEnum.NOT_FOUND,
      body: JSON.stringify({
        error: "not_found",
        error_description: "No Stored Identity exists for this user or Stored Identity has been invalidated",
      }),
    });
  });
});
