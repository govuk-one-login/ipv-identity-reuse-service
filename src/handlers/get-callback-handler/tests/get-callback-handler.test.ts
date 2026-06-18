import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { expect, it, vitest } from "vitest";
import { handler } from "../get-callback-handler";
import { getCookieValues } from "../../../commons/cookie-utilities";

process.env.DOMAIN_NAME = "test-domain";
process.env.OAUTH_INTERNAL_API = "https://test.com";

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

it("should return a 302 status code and redirect with an auth code and state on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  const token = getCookieValues(event)!.get("identity_reuse_service_session");
  expect(token).toBe("abc123");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 200,
    json: vitest.fn().mockResolvedValue({
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
      state: { value: "test-state" },
    }),
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect with an access_denied error and state when /api/authorization API call returns 403", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 403,
    json: vitest.fn().mockResolvedValue({
      error: "access_denied",
      state: "test-state",
    }),
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/?error=access_denied&state=test-state",
    },
  });
});

it("should return a 302 status code and redirect to the SIS error page when /api/authorization API call returns 400", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 400,
    json: vitest.fn().mockResolvedValue({
      error: "access_denied",
      state: "test-state",
    }),
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });
});

it("should return a 302 status code and redirect to error page when /api/authorization API call returns 500", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 500,
    json: vitest.fn().mockResolvedValue({
      error: "access_denied",
      state: "test-state",
    }),
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });
});

it("should return a 302 status code and redirect to error page when a call to the /api/authorization API fails", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockRejectedValue(new Error("TypeError: API call failed"));

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
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

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 200,
    json: vitest.fn().mockResolvedValue({
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
      state: { value: "test-state" },
    }),
  });

  const response = await handler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://test-domain/error/unrecoverable",
    },
  });

  expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Missing mandatory query string parameters"));
});

it("should log an error and redirect to the SIS error page if the authorization endpoint returns a missing redirection URI", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 200,
    json: vitest.fn().mockResolvedValue({
      authorizationCode: { value: "test-auth-code" },
      state: { value: "test-state" },
    }),
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

it("should log an error and redirect to the SIS error page if the authorization endpoint returns a missing auth code", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 200,
    json: vitest.fn().mockResolvedValue({
      redirectionURI: "https://api.example.com",
      state: { value: "test-state" },
    }),
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

it("should log an error and redirect to the SIS error page if the authorization endpoint returns a missing state", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");

  globalThis.fetch = vitest.fn().mockResolvedValue({
    status: 200,
    json: vitest.fn().mockResolvedValue({
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
    }),
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
