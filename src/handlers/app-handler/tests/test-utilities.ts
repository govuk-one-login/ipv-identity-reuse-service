import { Request, Response, NextFunction } from "express";
import { vi } from "vitest";

export const createExpressRequest = (
  requestOverrides?: Partial<Request>,
  sessionId?: string
): { request: Request; response: Response; next: NextFunction } => {
  const request: Request = {
    body: {},
    cookies: {
      identity_reuse_service_session: sessionId || "test-session-id",
    },
    ...requestOverrides,
  } as unknown as Request;
  const response = {} as Record<string, ReturnType<typeof vi.fn>>;
  const chainable = [
    "append",
    "attachment",
    "clearCookie",
    "contentType",
    "cookie",
    "format",
    "header",
    "links",
    "location",
    "render",
    "sendStatus",
    "set",
    "status",
    "type",
    "vary",
  ];

  for (const method of chainable) {
    response[method] = vi.fn(() => response);
  }

  const next = vi.fn();

  return { request, response: response as unknown as Response, next };
};
