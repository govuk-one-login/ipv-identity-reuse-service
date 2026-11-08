import { RequestHandler } from "express";
import { getSessionCookie } from "../../utilities/cookie-utilities.js";
import logger from "../../utilities/logger.js";
import { redirectToBadRequestExpress, redirectToSessionExpiredPageExpress } from "../../api/sis-api.js";

export const requireSecureSessionCookie: RequestHandler = (request, response, next) => {
  const sessionCookie = getSessionCookie(request, "identity_reuse_service_session");

  if (sessionCookie.status === "invalid-signature") {
    logger.error("Session cookie signature invalid");
    return redirectToBadRequestExpress(response);
  }

  if (sessionCookie.status === "missing") {
    return redirectToSessionExpiredPageExpress(response);
  }

  response.locals.sessionId = sessionCookie.sessionId;

  next();
};
