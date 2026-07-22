import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { beforeEach, describe, expect, it, MockInstance, vi, vitest } from "vitest";
import { AuthorizationQueryStringParameters, handler } from "../get-authorize-handler";
import * as oauthInternalService from "../../../services/oauth-internal-service";
import { CreateSessionError } from "../../../services/oauth-internal-service";

process.env.DOMAIN_NAME = "test-domain";
process.env.OAUTH_INTERNAL_API_URL = "https://example.com/v1";

vi.mock("../../../services/oauth-internal-service", () => ({
  callSessionApi: vi.fn(),
}));

describe("authorize-handler", () => {
  let fetchSessionIdSpy: MockInstance<typeof oauthInternalService.callSessionApi>;
  beforeEach(() => {
    vi.clearAllMocks();
    fetchSessionIdSpy = vitest.spyOn(oauthInternalService, "callSessionApi");
  });

  describe("when request param is absent", () => {
    it("should return 302 with redirect_uri and state", async () => {
      const event = createMockEvent({
        queryStringParameters: {
          client_id: "sample",
          response_type: "code",
          redirect_uri: "https://some.redirect.com",
          state: "test-state",
        } satisfies AuthorizationQueryStringParameters,
      });
      fetchSessionIdSpy = vitest.spyOn(oauthInternalService, "callSessionApi");

      const response = await handler(event, {} as Context);

      const expectedLocation = [
        "https://test-domain/confirm-details",
        "?state=test-state",
        "&redirect_uri=https%3A%2F%2Fsome.redirect.com",
      ].join("");

      expect(response.statusCode).toBe(302);
      expect(response.headers?.Location).toBe(expectedLocation);
      expect(fetchSessionIdSpy).not.toHaveBeenCalled();
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
        "?state=test-state",
        "&redirect_uri=https%253A%252F%252Fsome.redirect.com%252Fcallback",
      ].join("");

      expect(response.statusCode).toBe(302);
      expect(response.headers?.Location).toBe(expectedLocation);
    });
  });

  describe("when request param is present", () => {
    it("should redirect to confirm-details with session cookie on 201", async () => {
      const mockResponse = {
        session_id: "session-abc-123",
        state: "test-state",
        redirect_uri: "https://some.redirect.com",
      };
      fetchSessionIdSpy.mockResolvedValueOnce(mockResponse);

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

      expect(fetchSessionIdSpy).toHaveBeenCalledWith("orchestrator", "foo.bar.123");

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe(
        "https://test-domain/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fsome.redirect.com"
      );

      const expectedCookie = [
        "identity_reuse_service_session=session-abc-123",
        "Path=/",
        "Secure",
        "HttpOnly",
        "SameSite=Lax",
      ].join("; ");

      expect(response.headers?.["Set-Cookie"]).toBe(expectedCookie);
    });

    it("should redirect to error page when session handler returns an error", async () => {
      fetchSessionIdSpy.mockImplementationOnce(() => {
        throw new CreateSessionError("Session endpoint returned an error response");
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

    it("should redirect to error page when fetch throws", async () => {
      fetchSessionIdSpy.mockRejectedValueOnce(new Error("ECONNREFUSED"));

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
