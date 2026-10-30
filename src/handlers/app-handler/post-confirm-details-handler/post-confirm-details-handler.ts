import { createAuthCode, updateSessionData } from "../../../api/oauth-internal-api.js";
import {
  redirectToErrorPageExpress,
  redirectToSessionExpiredPageExpress,
  redirectToOauthCallBackExpress,
} from "../../../api/sis-api.js";
import { SessionInvalidError } from "../../../utilities/errors.js";
import logger from "../../../utilities/logger.js";
import { RequestHandler } from "express";

export const handler: RequestHandler = async (request, response) => {
  const action = request.body?.action;

  const sessionId = request.cookies?.["identity_reuse_service_session"];
  if (!sessionId) {
    logger.error("Session ID parameter is missing");
    return redirectToSessionExpiredPageExpress(response);
  }

  try {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (action === "update-details") {
      await updateSessionData(sessionId, { errorDescription: "record_update_requested" });
    } else {
      await createAuthCode(sessionId);
    }

    return redirectToOauthCallBackExpress(response);
  } catch (error) {
    logger.error(`Error in lambdaHandler event`, { error });
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPageExpress(response);
    }
    return redirectToErrorPageExpress(response);
  }
};
