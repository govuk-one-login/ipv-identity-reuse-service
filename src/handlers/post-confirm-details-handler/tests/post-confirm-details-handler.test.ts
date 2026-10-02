import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { lambdaHandler } from "../post-confirm-details-handler.js";
import { randomUUID } from "node:crypto";
import { createAuthCode } from "../../../api/oauth-internal-api.js";

const TEST_SESSION_ID = randomUUID();

vi.mock("../../../api/oauth-internal-api.js");

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

  const response = await lambdaHandler(event, {} as Context);
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

  // eslint-disable-next-line unicorn/no-useless-undefined -- Parameter required
  vi.mocked(createAuthCode).mockResolvedValue(undefined);

  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client",
    TEST_SESSION_ID
  );

  const response = await lambdaHandler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api.example.com/oauth2/callback",
    },
  });

  expect(createAuthCode).toHaveBeenCalledWith(TEST_SESSION_ID);
});

it("should redirect to the error page when createAuthCode throws an error", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");
  vi.mocked(createAuthCode).mockRejectedValue(new Error("API call failure"));

  const event = createMockAPIGatewayProxyEvent(
    {},
    "redirectUri=https%3A%2F%2Fapi.example.com&state=test-state-id&client_id=client",
    TEST_SESSION_ID
  );

  const response = await lambdaHandler(event, {} as Context);
  expect(response).toStrictEqual({
    statusCode: 302,
    body: "",
    headers: {
      Location: "https://api2.example.com/error/unrecoverable",
    },
  });
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
