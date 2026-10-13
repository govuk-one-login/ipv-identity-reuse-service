import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { afterEach, beforeEach, expect, it, Mock, vitest } from "vitest";
import { handler } from "../get-callback-handler.js";
import { getCookieValues } from "../../../utilities/cookie-utilities.js";
import { getAuthorizationCode, deleteSession } from "../../../api/oauth-internal-api.js";

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

vitest.mock("../../../api/oauth-internal-api", () => ({
  getAuthorizationCode: vitest.fn(),
  deleteSession: vitest.fn(),
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

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    authorizationCode: "test-auth-code",
    state: "test-state",
  };

  (getAuthorizationCode as Mock).mockResolvedValueOnce(mockResponse);

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
  });

  expect(deleteSession).not.toHaveBeenCalled();
});

it("should return a 302 status code and redirect with an access_denied error, record_unavailable error description, and state when /api/authorization API call returns without an authorization code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_unavailable",
    code: "access_denied",
  };

  (getAuthorizationCode as Mock).mockResolvedValueOnce(mockResponse);

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?error=access_denied&error_description=record_unavailable&state=test-state",
    },
  });

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
});

it("should return a 302 status code and redirect with an access_denied error, record_update_requested error description, and state when /api/authorization API call returns without an authorization code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_update_requested",
    code: "access_denied",
  };

  (getAuthorizationCode as Mock).mockResolvedValueOnce(mockResponse);

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location:
        "https://api.example.com/?error=access_denied&error_description=record_update_requested&state=test-state",
    },
  });

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
});

it("should return a 302 status code and redirect to session-expired page when the cookie is not set in the header", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  delete event.headers["Cookie"];

  const token = getCookieValues(event)?.get("identity_reuse_service_session");
  expect(token).toBe(undefined);
  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/session-expired",
    },
  });
});

it("should log an error and redirect to the SIS error page if any of the required query string parameters are missing", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  delete event.queryStringParameters!["redirect_uri"];

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Missing mandatory query string parameters"));
  expect(getAuthorizationCode).not.toHaveBeenCalled();
});

it("should log an error and redirect to the SIS error page if the authorization endpoint returns an error for a missing response property", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  (getAuthorizationCode as Mock).mockImplementationOnce(() => {
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

it("should log an error and redirect to the SIS error page if the fetch throws", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  (getAuthorizationCode as Mock).mockRejectedValueOnce(new Error("TypeError: API call failed"));

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(mockError).toHaveBeenCalledWith(expect.stringContaining("TypeError: API call failed"));
});

it("should log an error and redirect to the SIS error page if deleteSession throws after an access_denied response", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  const mockResponse = {
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_unavailable",
    code: "access_denied",
  };

  (getAuthorizationCode as Mock).mockResolvedValueOnce(mockResponse);
  (deleteSession as Mock).mockRejectedValueOnce(new Error("DELETE session/data endpoint returned an error response"));

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
  expect(mockError).toHaveBeenCalledWith(
    expect.stringContaining("DELETE session/data endpoint returned an error response")
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
