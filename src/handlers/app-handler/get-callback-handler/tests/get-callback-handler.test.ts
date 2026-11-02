import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { handler } from "../get-callback-handler.js";
import { getAuthorizationCode, getSessionDetails, deleteSession } from "../../../../api/oauth-internal-api.js";
import logger from "../../../../utilities/logger.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import {
  redirectToClientExpress,
  redirectToSessionExpiredPageExpress,
  redirectToErrorPageExpress,
} from "../../../../api/sis-api.js";

vitest.mock("../../../../utilities/logger.js");
vitest.mock("../../../../api/oauth-internal-api");
vitest.mock("../../../../api/sis-api.js");

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
  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    authorizationCode: "test-auth-code",
    state: "test-state",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientSessionId: "client-session-id",
    subject: "test-subject",
  });

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToClientExpress).toHaveBeenCalledWith(
    response,
    "https://api.example.com",
    "test-state",
    "test-auth-code",
    undefined,
    undefined
  );

  expect(deleteSession).not.toHaveBeenCalled();
});

it("should return a 302 status code and redirect with an access_denied error, record_unavailable error description, and state when /api/authorization API call returns without an authorization code", async () => {
  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_unavailable",
    code: "access_denied",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientSessionId: "client-session-id",
    subject: "test-subject",
  });

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToClientExpress).toHaveBeenCalledWith(
    response,
    "https://api.example.com",
    "test-state",
    undefined,
    "record_unavailable",
    "access_denied"
  );

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
});

it("should return a 302 status code and redirect with an access_denied error, record_update_requested error description, and state when /api/authorization API call returns without an authorization code", async () => {
  vitest.mocked(getAuthorizationCode).mockResolvedValue({
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_update_requested",
    code: "access_denied",
  });
  vitest.mocked(getSessionDetails).mockResolvedValue({
    clientSessionId: "client-session-id",
    subject: "test-subject",
  });

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToClientExpress).toHaveBeenCalledWith(
    response,
    "https://api.example.com",
    "test-state",
    undefined,
    "record_update_requested",
    "access_denied"
  );

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
});

it("should return a 302 status code and redirect to session-expired page when the cookie is not set in the header", async () => {
  const { request, response, next } = createExpressRequest({ cookies: {} });
  await handler(request, response, next);

  expect(redirectToSessionExpiredPageExpress).toHaveBeenCalledWith(response);
});

it("should log an error and redirect to the SIS error page if the authorization endpoint returns an error for a missing response property", async () => {
  vitest
    .mocked(getAuthorizationCode)
    .mockThrowOnce(new Error("Invalid response properties received from authorization endpoint"));

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  expect(logger.error).toHaveBeenCalledWith(
    "Error in OAuth Callback handler event: Error: Invalid response properties received from authorization endpoint"
  );
});

it("should log an error and redirect to the SIS error page if the fetch throws", async () => {
  vitest.mocked(getAuthorizationCode).mockRejectedValueOnce(new Error("TypeError: API call failed"));

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToErrorPageExpress).toHaveBeenCalledWith(response);
  expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("TypeError: API call failed"));
});

it("should log an error and redirect to the callback if deleteSession throws after an access_denied response", async () => {
  vitest.mocked(getAuthorizationCode).mockResolvedValueOnce({
    redirect_uri: "https://api.example.com",
    state: "test-state",
    message: "record_unavailable",
    code: "access_denied",
  });
  vitest
    .mocked(deleteSession)
    .mockRejectedValueOnce(new Error("DELETE session/data endpoint returned an error response"));

  const { request, response, next } = createExpressRequest({}, "abc123");
  await handler(request, response, next);

  expect(redirectToClientExpress).toHaveBeenCalledWith(
    response,
    "https://api.example.com",
    "test-state",
    undefined,
    "record_unavailable",
    "access_denied"
  );

  expect(deleteSession).toHaveBeenCalledTimes(1);
  expect(deleteSession).toHaveBeenCalledWith("abc123");
  expect(logger.error).toHaveBeenCalledExactlyOnceWith("Error occurred whilst deleting user session", {
    error: "Error",
    errorMessage: "DELETE session/data endpoint returned an error response",
    sessionId: "abc123",
  });
});
