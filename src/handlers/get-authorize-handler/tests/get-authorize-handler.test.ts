import { APIGatewayEventRequestContextWithAuthorizer, APIGatewayProxyEvent, Context } from "aws-lambda";
import { beforeEach, describe, expect, it, vi, vitest } from "vitest";
import { handler, AuthorizationQueryStringParameters, isValidQueryParameters } from "../get-authorize-handler.js";
import { callSessionApi } from "../../../api/oauth-internal-api.js";

vitest.mock("../../../api/oauth-internal-api.js");

describe("authorize-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vitest.stubEnv("DOMAIN_NAME", "test-domain");
    vitest.stubEnv("OAUTH_INTERNAL_API_URL", "https://example.com/v1");
    vitest.stubEnv("SESSION_TIMEOUT_MS", "5000");
  });

  describe("when client_id param is absent", () => {
    it("should return error if the client_id is absent", async () => {
      const event = createMockEvent({
        queryStringParameters: {} as AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response).toEqual({
        statusCode: 302,
        headers: {
          Location: "https://test-domain/error/unrecoverable",
        },
        body: "",
      });
    });
  });

  describe("when request param is present", () => {
    it("should redirect to confirm-details with session cookie on 201", async () => {
      vitest.mocked(callSessionApi).mockResolvedValueOnce({
        session_id: "session-abc-123",
        state: "test-state",
        redirect_uri: "https://some.redirect.com",
      });

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          request: "foo.bar.123",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(callSessionApi).toHaveBeenCalledWith("orchestrator", "foo.bar.123");
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

    it("should redirect to error page when session handler returns an error", async () => {
      vitest.mocked(callSessionApi).mockImplementationOnce(() => {
        throw new Error("Session endpoint returned an error response");
      });

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          request: "invalid.jar.content",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/error/unrecoverable");

      expect(response.headers?.["Set-Cookie"]).toBeUndefined();
    });

    it("should redirect to error page when fetch throws", async () => {
      vitest.mocked(callSessionApi).mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const event = createMockEvent({
        queryStringParameters: {
          client_id: "orchestrator",
          request: "some.jar.value",
        } satisfies AuthorizationQueryStringParameters,
      });

      const response = await handler(event, {} as Context);

      expect(response.statusCode).toBe(302);

      expect(response.headers?.Location).toBe("https://test-domain/error/unrecoverable");
    });
  });
});

describe("isValidQueryParameters", () => {
  it("should return true if valid", () => {
    expect(isValidQueryParameters({ client_id: "client-id", request: "request-id" })).toBeTruthy();
  });

  it("should return false if the object is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isValidQueryParameters(undefined)).toBeFalsy();
  });

  it("should return false if the object is null", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isValidQueryParameters(null)).toBeFalsy();
  });

  it("should return false if the client_id is empty string", () => {
    expect(isValidQueryParameters({ client_id: "", request: "request-value" })).toBeFalsy();
  });

  it("should return false if the client_id is empty string with spaces", () => {
    expect(isValidQueryParameters({ client_id: "    ", request: "request-value" })).toBeFalsy();
  });

  it("should return false if the request is empty string", () => {
    expect(isValidQueryParameters({ client_id: "client-id", request: "" })).toBeFalsy();
  });

  it("should return false if the request is empty string with spaces", () => {
    expect(isValidQueryParameters({ client_id: "client-id", request: "     " })).toBeFalsy();
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
