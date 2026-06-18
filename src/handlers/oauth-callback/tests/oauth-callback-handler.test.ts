import { vitest } from "vitest";
import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent } from "aws-lambda";
import { expect, it } from "vitest";
import Cookies from "js-cookie";
import { handler } from "../oauth-callback-handler";

vitest.mock("js-cookie");
process.env.DOMAIN_NAME = "test-domain";
process.env.OAUTH_INTERNAL_API = "https://test.com";

it("should return a 302 status code and redirect with an auth code and state on a successful request", async () => {
  const event = createMockAPIGatewayProxyEvent({}, "");
  const mockedCookies = vitest.mocked(Cookies);
  mockedCookies.get.mockReturnValue("identity_reuse_service_session" as never);

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
  const mockedCookies = vitest.mocked(Cookies);
  mockedCookies.get.mockReturnValue("identity_reuse_service_session" as never);

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
  const mockedCookies = vitest.mocked(Cookies);
  mockedCookies.get.mockReturnValue("identity_reuse_service_session" as never);

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
  const mockedCookies = vitest.mocked(Cookies);
  mockedCookies.get.mockReturnValue("identity_reuse_service_session" as never);

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
  const mockedCookies = vitest.mocked(Cookies);
  mockedCookies.get.mockReturnValue("identity_reuse_service_session" as never);

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

const createMockAPIGatewayProxyEvent = (event: Partial<APIGatewayProxyEvent>, body: string): APIGatewayProxyEvent => ({
  body: body,
  headers: {},
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
