import { deleteSession, getAuthorizationCode } from "../../../api/oauth-internal-api.js";
import {
  redirectToClientExpress,
  redirectToErrorPageExpress,
  redirectToSessionExpiredPageExpress,
} from "../../../api/sis-api.js";
import { SessionInvalidError } from "../../../utilities/errors.js";
import logger from "../../../utilities/logger.js";
import { RequestHandler } from "express";

export const handler: RequestHandler = async (request, response) => {
  const sessionId = request.cookies?.["identity_reuse_service_session"];
  if (!sessionId) {
    return redirectToSessionExpiredPageExpress(response);
  }

  try {
    const {
      redirect_uri: redirectUri,
      state,
      authorizationCode,
      message,
      code,
    } = await getAuthorizationCode(sessionId);

    if (code === "access_denied") {
      try {
        await deleteSession(sessionId);
      } catch (error) {
        logger.error("Error occurred whilst deleting user session", {
          sessionId,
          ...(error instanceof Error && { error: error.name, errorMessage: error.message }),
        });
      }
    }

    return redirectToClientExpress(response, redirectUri, state, authorizationCode, message, code);
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPageExpress(response);
    }
    return redirectToErrorPageExpress(response);
  }
};
