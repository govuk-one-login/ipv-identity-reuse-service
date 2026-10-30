import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handler } from "../post-confirm-details-handler.js";
import { randomUUID } from "node:crypto";
import { getSessionDetails, updateSessionData, createAuthCode } from "../../../../api/oauth-internal-api.js";
import { createExpressRequest } from "../../tests/test-utilities.js";
import {
  redirectToSessionExpiredPageExpress,
  redirectToOauthCallBackExpress,
  redirectToErrorPageExpress,
} from "../../../../api/sis-api.js";

const TEST_SESSION_ID = randomUUID().toString();

vi.mock("../../../../api/oauth-internal-api");
vi.mock("../../../../api/sis-api.js");

beforeEach(() => {
  vi.stubEnv("PUBLIC_API", "api.example.com");
  vi.stubEnv("DOMAIN_NAME", "api2.example.com");
  vi.stubEnv("SESSION_TIMEOUT_MS", "5000");
  vi.mocked(updateSessionData).mockResolvedValue();
  vi.mocked(getSessionDetails).mockResolvedValue({
    subject: "test-subject",
    clientSessionId: "session-id",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

it("should redirect to the session-expired page if the session is not provided", async () => {
  const { request, response, next } = createExpressRequest({
    body: {},
    cookies: {},
  });

  await handler(request, response, next);

  expect(redirectToSessionExpiredPageExpress).toHaveBeenCalledExactlyOnceWith(response);
});

it("should return a 302 status code on a successful request", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://internal.example.com");

  // eslint-disable-next-line unicorn/no-useless-undefined -- Parameter required
  vi.mocked(createAuthCode).mockResolvedValue(undefined);

  const { request, response, next } = createExpressRequest({}, TEST_SESSION_ID);

  await handler(request, response, next);

  expect(redirectToOauthCallBackExpress).toHaveBeenCalledExactlyOnceWith(response);

  expect(updateSessionData).not.toHaveBeenCalled();
});

it("should redirect to the error page when createAuthCode throws an error", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");
  vi.mocked(createAuthCode).mockRejectedValue(new Error("API call failure"));

  const { request, response, next } = createExpressRequest({}, TEST_SESSION_ID);

  await handler(request, response, next);

  expect(redirectToErrorPageExpress).toHaveBeenCalledExactlyOnceWith(response);
});

it("should set record_update_requested if update-details action received", async () => {
  vi.stubEnv("OAUTH_INTERNAL_API_URL", "https://internal.example.com");

  // eslint-disable-next-line unicorn/no-useless-undefined -- Parameter required
  vi.mocked(createAuthCode).mockResolvedValue(undefined);

  const { request, response, next } = createExpressRequest(
    {
      body: {
        action: "update-details",
      },
    },
    TEST_SESSION_ID
  );

  await handler(request, response, next);

  expect(redirectToOauthCallBackExpress).toHaveBeenCalledExactlyOnceWith(response);

  expect(vi.mocked(updateSessionData)).toHaveBeenCalledWith(TEST_SESSION_ID, {
    errorDescription: "record_update_requested",
  });
});
