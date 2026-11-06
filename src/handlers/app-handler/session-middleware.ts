import { storeTokenInState } from "./csrf.js";
import { getSessionDetails } from "../../api/oauth-internal-api.js";
import { RequestHandler } from "express";
import logger from "../../utilities/logger.js";

export const sessionMiddleware: RequestHandler = async (request, response, next) => {
  request.session = {};

  const sessionId = request.cookies?.["identity_reuse_service_session"];
  if (sessionId) {
    request.session.sessionId = sessionId;

    try {
      const sessionData = await getSessionDetails(sessionId);
      storeTokenInState(request, sessionData?.sessionData?.csrfToken);
    } catch (error) {
      logger.error("Error", { e: error });
    }
  }

  next();
};
