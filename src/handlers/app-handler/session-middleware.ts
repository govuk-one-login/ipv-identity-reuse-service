import { storeTokenInState } from "./csrf.js";
import { getSessionDetails } from "../../api/oauth-internal-api.js";
import { getSessionCookie } from "../../utilities/cookie-utilities.js";
import { RequestHandler } from "express";
import logger from "../../utilities/logger.js";

export const sessionMiddleware: RequestHandler = async (request, response, next) => {
  request.session = request.session ?? {};

  const sessionCookie = getSessionCookie(request, "identity_reuse_service_session");
  if (sessionCookie.status === "valid") {
    const sessionId = sessionCookie.sessionId;
    request.session.sessionId = sessionId;

    try {
      const sessionData = await getSessionDetails(sessionId);
      const csrfToken = sessionData?.sessionData?.csrfToken;
      if (csrfToken) {
        storeTokenInState(request, csrfToken);
      }
    } catch (error) {
      logger.error("Error", { e: error });
    }
  }

  next();
};
