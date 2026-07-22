import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { lambdaHandler } from "../post-confirm-details-handler";
import { randomUUID } from "node:crypto";

const TEST_SESSION_ID = randomUUID();

beforeEach(() => {
  vi.stubEnv("PUBLIC_API", "api.example.com");
  vi.stubEnv("DOMAIN_NAME", "api2.example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it("should redirect to the error page if the session is not provided", async () => {
  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client"
  );

  const response = await lambdaHandler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api2.example.com/error/unrecoverable",
    },
  });
});

it("should return a 302 status code on a successful request", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://internal.example.com");

  const mockFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("", { status: 201 }));

  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client",
    TEST_SESSION_ID
  );

  const response = await lambdaHandler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location:
        "https://api.example.com/oauth2/callback?redirect_uri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client",
    },
  });

  expect(mockFetch).toHaveBeenCalledWith(new URL("https://internal.example.com/api/create-auth-code"), {
    method: "POST",
    headers: {
      "session-id": TEST_SESSION_ID,
    },
  });

  mockFetch.mockRestore();
});

it("should return an error when some query string parameters are missing", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "redirectUri=https%3A%2F%2Fapi.example.com");
  await expect(lambdaHandler(event)).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined",
  });

  const event2 = createMockAPIGatewayProxyEvent({}, "code=abc123&state=test-state-id");
  await expect(lambdaHandler(event2)).rejects.toMatchObject({
    message: "One or more required query string parameters are undefined",
  });
});

it("should redirect to the error page when createAuthCode throws an error", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");

  const mockFetch = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("API call failure"));

  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client",
    TEST_SESSION_ID
  );

  const response = await lambdaHandler(event);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api2.example.com/error/unrecoverable",
    },
  });

  mockFetch.mockRestore();
});

const createMockAPIGatewayProxyEvent = (
  event: Partial<APIGatewayProxyEvent>,
  body: string,
  sessionId?: string
): APIGatewayProxyEvent => ({
  body: body,
  headers: {
    ...(sessionId && { cookie: `identity_reuse_service_session=${sessionId}` }),
  },
  multiValueHeaders: {},
  httpMethod: "POST",
  isBase64Encoded: false,
  path: "/",
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  pathParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  queryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  multiValueQueryStringParameters: null,
  // eslint-disable-next-line unicorn/no-null -- Required to create valid APIGatewayProxyEvent
  stageVariables: null,
  requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
  resource: "/",
  ...event,
});
