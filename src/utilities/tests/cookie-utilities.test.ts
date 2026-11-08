import { expect, it } from "vitest";
import { Request } from "express";
import { getSessionCookie } from "../cookie-utilities.js";

const COOKIE_NAME = "identity_reuse_service_session";

const buildRequest = (cookies?: Record<string, unknown>, signedCookies?: Record<string, unknown>): Request =>
  ({ cookies, signedCookies }) as unknown as Request;

it("returns valid with the sessionId when the signed cookie is present and verified", () => {
  const request = buildRequest(undefined, { [COOKIE_NAME]: "a-session-id" });

  expect(getSessionCookie(request, COOKIE_NAME)).toStrictEqual({ status: "valid", sessionId: "a-session-id" });
});

it("returns missing when no cookie of that name was sent at all", () => {
  const request = buildRequest({}, {});

  expect(getSessionCookie(request, COOKIE_NAME)).toStrictEqual({ status: "missing" });
});

it("returns missing when cookies and signedCookies are undefined", () => {
  const request = buildRequest();

  expect(getSessionCookie(request, COOKIE_NAME)).toStrictEqual({ status: "missing" });
});

it("returns invalid-signature when cookie-parser reports a failed signature verification", () => {
  const request = buildRequest({}, { [COOKIE_NAME]: false });

  expect(getSessionCookie(request, COOKIE_NAME)).toStrictEqual({ status: "invalid-signature" });
});

it("returns invalid-signature when the cookie value was replaced with an unsigned value", () => {
  const request = buildRequest({ [COOKIE_NAME]: "tampered-session-id-value" }, {});

  expect(getSessionCookie(request, COOKIE_NAME)).toStrictEqual({ status: "invalid-signature" });
});
