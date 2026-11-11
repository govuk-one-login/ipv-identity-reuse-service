import "vitest";
import { csrfSynchronisedProtection } from "../csrf.js";
import { expect, describe, it, vi, beforeEach } from "vitest";
import { createExpressRequest } from "./test-utilities.js";
import logger from "../../../utilities/logger.js";
import { redirectToBadRequestExpress } from "../../../api/sis-api.js";

vi.mock("../../../utilities/logger.js");
vi.mock("../../../api/sis-api.js");

describe("csrfSynchronisedProtection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("GET requests should call next", () => {
    const { request, response, next } = createExpressRequest({
      method: "GET",
      path: "/example",
    });

    csrfSynchronisedProtection(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(logger.error).not.toHaveBeenCalled();
    expect(redirectToBadRequestExpress).not.toHaveBeenCalled();
  });

  it("POST if the CSRF is missing in body and session", () => {
    const { request, response, next } = createExpressRequest({
      method: "POST",
      path: "/example",
      session: {},
    });

    csrfSynchronisedProtection(request, response, next);

    expect(logger.error).toHaveBeenCalledWith("CSRF protection returned an error", {
      error: "invalid csrf token",
    });
    expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
  });

  it("POST if the CSRF is valid in session but not body", () => {
    const { request, response, next } = createExpressRequest({
      method: "POST",
      path: "/example",
      session: {
        csrfToken: "csrf-token-1",
      },
    });

    csrfSynchronisedProtection(request, response, next);

    expect(logger.error).toHaveBeenCalledWith("CSRF protection returned an error", {
      error: "invalid csrf token",
    });
    expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
  });

  it("POST if the CSRF is valid in body and missing in session", () => {
    const { request, response, next } = createExpressRequest({
      method: "POST",
      path: "/example",
      session: {},
      body: {
        _csrf: "csrf-token-1",
      },
    });

    csrfSynchronisedProtection(request, response, next);

    expect(logger.error).toHaveBeenCalledWith("CSRF protection returned an error", {
      error: "invalid csrf token",
    });
    expect(redirectToBadRequestExpress).toHaveBeenCalledWith(response);
  });

  it("POST if the CSRF is valid in body and session", () => {
    const { request, response, next } = createExpressRequest({
      method: "POST",
      path: "/example",
      session: {
        csrfToken: "csrf-token-1",
      },
      body: {
        _csrf: "csrf-token-1",
      },
    });

    csrfSynchronisedProtection(request, response, next);

    expect(next).toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalledWith();
    expect(redirectToBadRequestExpress).not.toHaveBeenCalled();
  });
});
