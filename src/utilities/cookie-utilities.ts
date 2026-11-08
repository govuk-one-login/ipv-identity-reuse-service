import { Request } from "express";

export type SessionCookieResult =
  { status: "valid"; sessionId: string } | { status: "invalid-signature" } | { status: "missing" };

export const getSessionCookie = (request: Request, cookieName: string): SessionCookieResult => {
  const signedValue = request.signedCookies?.[cookieName];

  if (signedValue === false) {
    return { status: "invalid-signature" };
  }

  if (typeof signedValue === "string") {
    return { status: "valid", sessionId: signedValue };
  }

  if (request.cookies?.[cookieName] !== undefined) {
    return { status: "invalid-signature" };
  }

  return { status: "missing" };
};
