import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { handler } from "../get-callback-handler.js";
import { getCookieValues } from "../../../commons/cookie-utilities.js";
import { getAuthorizationCode, getSessionDetails } from "../../../api/oauth-internal-api.js";
import { Context } from "aws-lambda";
import logger from "../../../commons/logger.js";

vitest.mock("../../../commons/logger.js");
vitest.mock("../../../api/oauth-internal-api");

beforeEach(() => {
  vitest.clearAllMocks();
});

afterEach(() => {
  vitest.restoreAllMocks();
});

beforeEach(() => {
  vitest.stubEnv("DOMAIN_NAME", "test-domain");
  vitest.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");
  vitest.stubEnv("SESSION_TIMEOUT_MS", "5000");
});

it("should return a 302 status code and redirect with an auth code and state on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  const token = getCookieValues(event)!.get("identity_reuse_service_session");
  expect(token).toBe("abc123");

  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    authorizationCode: "test-auth-code",
    state: "test-state",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientId: "test-client-id",
    subject: "test-subject",
    redirectUri: "https://www.example.com",
    state: "test-state",
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect with an access_denied error, record_unavailable error description, and state when /api/authorization API call returns without an authorization code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_unavailable",
    code: "access_denied",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientId: "test-client-id",
    subject: "test-subject",
    redirectUri: "https://www.example.com",
    state: "test-state",
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?error=access_denied&error_description=record_unavailable&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect with an access_denied error, record_update_requested error description, and state when /api/authorization API call returns without an authorization code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_update_requested",
    code: "access_denied",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientId: "test-client-id",
    subject: "test-subject",
    redirectUri: "https://www.example.com",
    state: "test-state",
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location:
        "https://api.example.com/?error=access_denied&error_description=record_update_requested&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect to error page when the cookie is not set in the header", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  delete event.headers["Cookie"];

  const token = getCookieValues(event)?.get("identity_reuse_service_session");
  expect(token).toBe(undefined);
  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });
});

it("should log an error and redirect to the SIS error page if the authorization endpoint returns an error for a missing response property", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  vitest.mocked(getAuthorizationCode).mockImplementationOnce(() => {
    throw new Error("Invalid response properties received from authorization endpoint");
  });

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(logger.error).toHaveBeenCalled();
  expect(logger.error).toHaveBeenCalledWith(
    expect.stringContaining("Invalid response properties received from authorization endpoint")
  );
});

it("should log an error and redirect to the SIS error page if the fetch throws", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  vitest.mocked(getAuthorizationCode).mockRejectedValueOnce(new Error("TypeError: API call failed"));

  const response = await handler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("TypeError: API call failed"));
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
