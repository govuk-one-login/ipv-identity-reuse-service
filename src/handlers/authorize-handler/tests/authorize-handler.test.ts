import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationQueryStringParameters, handler } from "../authorize-handler";

process.env.DOMAIN_NAME = "test-domain";
process.env.OAUTH_INTERNAL_API_URL = "https://example.com/v1";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("authorize-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("when request param is absent", () => {
    it("should return 302 with hardcoded auth code", async () => {
      const event = createMockEvent({
        queryStringParameters: {
          client_id: "sample",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      const expectedLocation = [
        "https://test-domain/confirm-details",
        "?code=SplxlOBeZQQYbYS6WxSbIA",
        "&state=test-state",
        "&redirect_uri=https%3A%2F%2Fsome.redirect.com",
      ].join("");

      expect(response.statusCode).toBe(302);
      expect(response.headers?.Location).toBe(expectedLocation);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should handle URL encoded redirect_uri", async () => {
      const event = createMockEvent({
        queryStringParameters: {
          client_id: "sample",
          response_type: "code",
          redirect_uri: "https%3A%2F%2Fsome.redirect.com%2Fcallback",
          state: "test-state",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      const expectedLocation = [
        "https://test-domain/confirm-details",
        "?code=SplxlOBeZQQYbYS6WxSbIA",
        "&state=test-state",
        "&redirect_uri=https%253A%252F%252Fsome.redirect.com%252Fcallback",
      ].join("");

      expect(response.statusCode).toBe(302);
      expect(response.headers?.Location).toBe(expectedLocation);
    });
  });

  describe("when request param is present", () => {
    it("should redirect to confirm-details with session cookie on 201", async () => {
      mockFetch.mockResolvedValue({
        status: 201,
        json: async () => ({
          session_id: "session-abc-123",
          state: "test-state",
          redirect_uri: "https://some.redirect.com",
        }),
      });

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
          request: "foo.bar.123",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/v1/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: "orchestrator",
          request: "foo.bar.123",
        }),
        signal: expect.any(AbortSignal),
      });

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/confirm-details");

      const expectedCookie = [
        "identity_reuse_service_session=session-abc-123",
        "Path=/",
        "Secure",
        "HttpOnly",
        "SameSite=Lax",
      ].join("; ");

      expect(response.headers?.["Set-Cookie"]).toBe(expectedCookie);
    });

    it("should redirect to error page when session handler returns 400", async () => {
      mockFetch.mockResolvedValue({
        status: 400,
      });

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
          request: "invalid.jar.content",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/error/unrecoverable");

      expect(response.headers?.["Set-Cookie"]).toBeUndefined();
    });

    it("should redirect to error page when session handler returns 500", async () => {
      mockFetch.mockResolvedValue({
        status: 500,
      });

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
          request: "some.jar.value",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/error/unrecoverable");
    });

    it("should redirect to error page when fetch throws", async () => {
      mockFetch.mockRejectedValue(new Error("ECONNREFUSED"));

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
          request: "some.jar.value",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/error/unrecoverable");
    });
  });
});

function createMockEvent(overrides: Partial<APIGatewayProxyEvent>): APIGatewayProxyEvent {
  return {
    // eslint-disable-next-line unicorn/no-null
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "GET",
    isBase64Encoded: false,
    path: "/",
    // eslint-disable-next-line unicorn/no-null
    pathParameters: null,
    // eslint-disable-next-line unicorn/no-null
    queryStringParameters: null,
    // eslint-disable-next-line unicorn/no-null
    multiValueQueryStringParameters: null,
    // eslint-disable-next-line unicorn/no-null
    stageVariables: null,
    requestContext: {} as APIGatewayEventRequestContextWithAuthorizer<never>,
    resource: "/",
    ...overrides,
  };
}
