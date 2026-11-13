import { describe, it, expect } from "vitest";
import { setLocalVariablesMiddleware } from "../local-variables-middleware.js";
import { createExpressRequest } from "./test-utilities.js";

describe("setLocalVariablesMiddleware", () => {
  it("should set the variables", () => {
    const { request, response, next } = createExpressRequest(undefined, { locals: {} });
    setLocalVariablesMiddleware(request, response, next);

    expect(next).toHaveBeenCalledWith();
    expect(response.locals).toBeDefined();
    expect(response.locals).toEqual({
      cspNonce: expect.stringMatching(/^.{16,}$/s),
    });
  });

  it("should create a new CSP value each time it's called", () => {
    const { request, response, next } = createExpressRequest(undefined, { locals: {} });
    setLocalVariablesMiddleware(request, response, next);

    const { request: request2, response: response2, next: next2 } = createExpressRequest(undefined, { locals: {} });
    setLocalVariablesMiddleware(request2, response2, next2);

    expect(response.locals.cspNonce).not.toEqual(response2.locals.cspNonce);
  });
});
