import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { handler } from "../get-callback-handler";
import { getCookieValues } from "../../../commons/cookie-utilities";
import * as oauthInternalService from "../../../services/oauth-internal-service";

process.env.DOMAIN_NAME = "test-domain";
process.env.OAUTH_INTERNAL_API_URL = "https://test.com";

const { mockError } = vitest.hoisted(() => {
  return {
    mockError: vitest.fn(),
  };
});

vitest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: class {
      error = mockError;
      constructor() {}
    },
  };
});

vitest.mock("../../services/oauth-internal", () => ({
  getAuthorizationCode: vitest.fn(),
}));

beforeEach(() => {
  vitest.clearAllMocks();
});

afterEach(() => {
  vitest.restoreAllMocks();
});

it("should return a 302 status code and redirect with an auth code and state on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  const token = getCookieValues(event)!.get("identity_reuse_service_session");
  expect(token).toBe("abc123");

  const fetchAuthCodeSpy = vitest.spyOn(oauthInternalService, "getAuthorizationCode");

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    authorizationCode: "test-auth-code",
    state: "test-state",
  };

  fetchAuthCodeSpy.mockResolvedValueOnce(mockResponse);

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect with an access_denied error and state when /api/authorization API call returns without an authorization code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  const fetchAuthCodeSpy = vitest.spyOn(oauthInternalService, "getAuthorizationCode");

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    state: "test-state",
  };

  fetchAuthCodeSpy.mockResolvedValueOnce(mockResponse);

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?error=access_denied&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect to error page when the cookie is not set in the header", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  delete event.headers["Cookie"];

  const token = getCookieValues(event)?.get("identity_reuse_service_session");
  expect(token).toBe(undefined);
  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });
});

it("should log an error and redirect to the SIS error page if any of the required query string parameters are missing", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  delete event.queryStringParameters!["redirect_uri"];

  const fetchAuthCodeSpy = vitest.spyOn(oauthInternalService, "getAuthorizationCode");

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Missing mandatory query string parameters"));
  expect(fetchAuthCodeSpy).not.toHaveBeenCalled();
});

it("should log an error and redirect to the SIS error page if the authorization endpoint returns an error for a missing response property", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  const fetchAuthCodeSpy = vitest.spyOn(oauthInternalService, "getAuthorizationCode");
  fetchAuthCodeSpy.mockImplementationOnce(() => {
    throw new Error("Invalid response properties received from authorization endpoint");
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(mockError).toHaveBeenCalled();
  expect(mockError).toHaveBeenCalledWith(
    expect.stringContaining("Invalid response properties received from authorization endpoint")
  );
});

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>, body: string): APIGatewayProxyEvent => ({
  body: body,
  headers: { Cookie: "identity_reuse_service_session=abc123" },
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/",
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  pathParameters: null,
  queryStringParameters: { redirect_uri: "https://api.example.com", state: "test-state", client_id: "test-client-id" },
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  multiValueQueryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  stageVariables: null,
  requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
  resource: "/",
  ...event,
});
