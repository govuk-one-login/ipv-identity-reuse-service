import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../utilities/logger.js";
import { getCookieValues } from "../../utilities/cookie-utilities.js";
import { getAuthorizationCode } from "../../api/oauth-internal-api.js";
import { redirectToClient, redirectToErrorPage, redirectToSessionExpiredPage } from "../../api/sis-api.js";
import { SessionInvalidError } from "../../utilities/errors.js";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    return redirectToSessionExpiredPage();
  }

  try {
    const {
      redirect_uri: redirectUri,
      state,
      authorizationCode,
      message,
      code,
    } = await getAuthorizationCode(sessionId);

    return redirectToClient(redirectUri, state, authorizationCode, message, code);
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPage();
    }
    return redirectToErrorPage();
  }
};
