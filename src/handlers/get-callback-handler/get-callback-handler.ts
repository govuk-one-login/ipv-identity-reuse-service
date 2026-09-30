import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import { getAuthorizationCode, getSessionDetails } from "../../api/oauth-internal-api.js";
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
    const sessionDetails = await getSessionDetails(sessionId);
    const responseFromAuthorizeEndpoint = await getAuthorizationCode(
      sessionDetails.clientId,
      sessionDetails.redirectUri,
      sessionDetails.state,
      sessionId
    );

    return redirectToClient({
      redirectUri: responseFromAuthorizeEndpoint.redirect_uri,
      state: responseFromAuthorizeEndpoint.state,
      authorizationCode: responseFromAuthorizeEndpoint.authorizationCode,
      errorDescription: responseFromAuthorizeEndpoint.message,
      error: responseFromAuthorizeEndpoint.code,
    });
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    return redirectToErrorPage(domainName);
  }
};
