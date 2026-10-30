import { beforeEach, describe, expect, it, vi, vitest } from "vitest";
import { handler, AuthorizationQueryStringParameters, isValidQueryParameters } from "../get-authorize-handler.js";
import { callSessionApi } from "../../../../api/oauth-internal-api.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import {
  redirectToBadRequestExpress,
  redirectToConfirmDetailsExpress,
  redirectToErrorPageExpress,
} from "../../../../api/sis-api.js";

vitest.mock("../../../../api/oauth-internal-api.js");
vitest.mock("../../../../api/sis-api.js");

describe("authorize-handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vitest.stubEnv("DOMAIN_NAME", "test-domain");
    vitest.stubEnv("OAUTH_INTERNAL_API_URL", "https://example.com/v1");
    vitest.stubEnv("SESSION_TIMEOUT_MS", "5000");
  });

  describe("Parameter is absent", () => {
    it("should return error if the client_id is absent", async () => {
      const { request, response, next } = createExpressRequest({
        query: {
          request: "sample-request",
        },
      });
      await handler(request, response, next);

      expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
    });

    it("should return error if the request is absent", async () => {
      const { request, response, next } = createExpressRequest({
        query: {
          client_id: "client-id",
        },
      });
      await handler(request, response, next);

      expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
    });
  });

  describe("when request param is present", () => {
    it("should redirect to confirm-details with session cookie on 201", async () => {
      vitest.mocked(callSessionApi).mockResolvedValueOnce({
        session_id: "session-abc-123",
        state: "test-state",
        redirect_uri: "https://some.redirect.com",
      });

      const { request, response, next } = createExpressRequest({
        query: {
          client_id: "orchestrator",
          request: "foo.bar.123",
        } as AuthorizationQueryStringParameters,
      });
      await handler(request, response, next);

      expect(callSessionApi).toHaveBeenCalledWith("orchestrator", "foo.bar.123");
      expect(redirectToConfirmDetailsExpress).toHaveBeenCalledWith(response, "session-abc-123");
    });

    it("should redirect to error page when session handler returns an error", async () => {
      vitest.mocked(callSessionApi).mockImplementationOnce(() => {
        throw new Error("Session endpoint returned an error response");
      });

      const { request, response, next } = createExpressRequest({
        query: {
          client_id: "orchestrator",
          request: "foo.bar.123",
        } as AuthorizationQueryStringParameters,
      });
      await handler(request, response, next);

      expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
    });

    it("should redirect to error page when fetch throws", async () => {
      vitest.mocked(callSessionApi).mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const { request, response, next } = createExpressRequest({
        query: {
          client_id: "orchestrator",
          request: "foo.bar.123",
        } as AuthorizationQueryStringParameters,
      });
      await handler(request, response, next);

      expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
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
