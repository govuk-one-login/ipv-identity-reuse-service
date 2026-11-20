import { describe, it, expect, vi } from "vitest";
import { helmetConfiguration } from "../helmet.js";
import { createExpressRequest } from "./test-utilities.js";
import { randomBytes } from "node:crypto";

vi.mock("../../../utilities/logger.js");

describe("helmetConfiguration", () => {
  it.each(["styleSrc", "scriptSrc"])("should correctly return nonce-... from %s", (source) => {
    const cspNonce = randomBytes(16).toString("base64");
    const { request, response } = createExpressRequest(
      {},
      {
        locals: {
          cspNonce,
        },
      }
    );

    if (typeof helmetConfiguration.contentSecurityPolicy !== "object") {
      throw new TypeError("contentSecurityPolicy should be set");
    }

    if (!Array.isArray(helmetConfiguration.contentSecurityPolicy.directives?.[source])) {
      throw new TypeError(`directives?.[${source}] should be set`);
    }

    const nonceFunction = helmetConfiguration.contentSecurityPolicy.directives?.[source]?.find(
      (item: unknown) => typeof item === "function"
    );

    expect(nonceFunction).toBeInstanceOf(Function);
    expect(nonceFunction?.(request, response)).toEqual(`'nonce-${cspNonce}'`);
  });
});
