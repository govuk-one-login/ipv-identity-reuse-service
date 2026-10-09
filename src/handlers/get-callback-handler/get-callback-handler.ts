import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import { getAuthorizationCode } from "../../api/oauth-internal-api.js";
import { redirectToClient, redirectToErrorPage } from "../../api/sis-api.js";
import { getRequiredEnvironment } from "../../commons/get-required-environment.js";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    return redirectToErrorPage(domainName);
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
    return redirectToErrorPage(domainName);
  }
};
