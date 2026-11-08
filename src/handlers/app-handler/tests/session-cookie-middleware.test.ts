import { afterEach, describe, expect, it, vitest } from "vitest";
import { requireSecureSessionCookie } from "../session-cookie-middleware.js";
import { redirectToBadRequestExpress, redirectToSessionExpiredPageExpress } from "../../../api/sis-api.js";
import { createExpressRequest } from "./test-utilities.js";

vitest.mock("../../../api/sis-api.js");
vitest.mock("../../../utilities/logger.js");

afterEach(() => {
  vitest.clearAllMocks();
});

describe("requireSecureSessionCookie", () => {
  it("calls next and sets the sessionId on response.locals when the cookie is valid", () => {
    const { request, response, next } = createExpressRequest(undefined, undefined, "a-valid-session-id");

    requireSecureSessionCookie(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(response.locals.sessionId).toBe("a-valid-session-id");
    expect(redirectToBadRequestExpress).not.toHaveBeenCalled();
    expect(redirectToSessionExpiredPageExpress).not.toHaveBeenCalled();
  });

  it("redirects to the session-expired page when the session cookie is missing", () => {
    const { request, response, next } = createExpressRequest({ signedCookies: {} });

    requireSecureSessionCookie(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(redirectToSessionExpiredPageExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to the bad-request page when the session cookie signature is invalid", () => {
    const { request, response, next } = createExpressRequest({
      signedCookies: { identity_reuse_service_session: false },
    });

    requireSecureSessionCookie(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
  });

  it("redirects to the bad-request page when the session cookie value was replaced with an unsigned value", () => {
    const { request, response, next } = createExpressRequest({
      cookies: { identity_reuse_service_session: "tampered-session-id-value" },
      signedCookies: {},
    });

    requireSecureSessionCookie(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
  });
});
