import { describe, it, expect, vi } from "vitest";
import { loggerMiddleware } from "../logger-middleware.js";
import { createExpressRequest } from "../tests/test-utilities.js";
import { getCurrentInvoke } from "@codegenie/serverless-express";
import logger from "../../../utilities/logger.js";

vi.mock("@codegenie/serverless-express");
vi.mock("../../../utilities/logger.js");

describe("loggerMiddleware", () => {
  it("should include correct information and register callbacks", () => {
    const { request, response, next } = createExpressRequest({
      method: "GET",
      path: "/example",
    });

    const context = {};
    vi.mocked(getCurrentInvoke).mockReturnValue({ context });

    loggerMiddleware(request, response, next);

    expect(logger.addContext).toHaveBeenCalledWith(context);
    expect(logger.appendKeys).toHaveBeenCalledWith({ method: "GET", path: "/example" });
    expect(logger.info).toHaveBeenCalledWith("Incoming request: GET /example", {
      method: "GET",
      path: "/example",
    });
    expect(response.on).toHaveBeenCalledWith("finish", expect.any(Function));
    expect(response.on).toHaveBeenCalledWith("error", expect.any(Function));

    expect(next).toHaveBeenCalledWith();
  });
});
