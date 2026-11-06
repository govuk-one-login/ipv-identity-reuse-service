import { describe, it, expect, vi } from "vitest";
import { sessionMiddleware } from "../session-middleware.js";
import { createExpressRequest } from "./test-utilities.js";
import { getSessionDetails } from "../../../api/oauth-internal-api.js";
import logger from "../../../utilities/logger.js";

vi.mock("../../../api/oauth-internal-api.js");
vi.mock("../../../utilities/logger.js");

describe("sessionMiddleware", () => {
  it("should add the session to the request if session is not present", async () => {
    const { request, response, next } = createExpressRequest({ cookies: {} });

    await sessionMiddleware(request, response, next);

    expect(request.session).toStrictEqual({});
    expect(next).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should add the session to the request if session present", async () => {
    const { request, response, next } = createExpressRequest();

    expect(request.cookies).toEqual({
      identity_reuse_service_session: "test-session-id",
    });

    vi.mocked(getSessionDetails).mockResolvedValue({
      clientSessionId: "client-session-id",
      subject: "subject",
    });

    await sessionMiddleware(request, response, next);

    expect(request.session).toStrictEqual({
      sessionId: "test-session-id",
    });
    expect(next).toHaveBeenCalledWith();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should store the token in the session if it exists", async () => {
    const { request, response, next } = createExpressRequest();

    expect(request.cookies).toEqual({
      identity_reuse_service_session: "test-session-id",
    });

    vi.mocked(getSessionDetails).mockResolvedValue({
      clientSessionId: "client-session-id",
      subject: "subject",
      sessionData: {
        vot: "P3",
        storedIdentitySha256: "sha256",
        csrfToken: "csrf-token-1",
      },
    });

    await sessionMiddleware(request, response, next);

    expect(request.session).toStrictEqual({
      sessionId: "test-session-id",
      csrfToken: "csrf-token-1",
    });
    expect(next).toHaveBeenCalledWith();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should not store the token in the session if it does not exist", async () => {
    const { request, response, next } = createExpressRequest();

    expect(request.cookies).toEqual({
      identity_reuse_service_session: "test-session-id",
    });

    vi.mocked(getSessionDetails).mockResolvedValue({
      clientSessionId: "client-session-id",
      subject: "subject",
      sessionData: {
        vot: "P3",
        storedIdentitySha256: "sha256",
      },
    });

    await sessionMiddleware(request, response, next);

    expect(request.session).toStrictEqual({
      sessionId: "test-session-id",
    });
    expect(next).toHaveBeenCalledWith();
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("should catch errors and log them", async () => {
    const { request, response, next } = createExpressRequest();

    expect(request.cookies).toEqual({
      identity_reuse_service_session: "test-session-id",
    });

    const mockError = new Error("Test error");
    vi.mocked(getSessionDetails).mockRejectedValue(mockError);

    await sessionMiddleware(request, response, next);

    expect(request.session).toStrictEqual({
      sessionId: "test-session-id",
    });
    expect(next).toHaveBeenCalledWith();
    expect(logger.error).toHaveBeenCalledWith("Error", { e: mockError });
  });
});
