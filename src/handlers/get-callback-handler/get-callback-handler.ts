import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../utilities/logger.js";
import { getCookieValues } from "../../utilities/cookie-utilities.js";
import { isValidQueryParameters } from "./get-callback-types.js";
import { getAuthorizationCode } from "../../api/oauth-internal-api.js";
import { redirectToClient, redirectToErrorPage, redirectToSessionExpiredPage } from "../../api/sis-api.js";
import { getRequiredEnvironment } from "../../configuration/get-required-environment.js";
import { SessionInvalidError } from "../../utilities/errors.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const queryParameters = event.queryStringParameters || {};

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  if (!isValidQueryParameters(queryParameters)) {
    logger.error("Missing mandatory query string parameters to the GetCallbackHandler");
    return redirectToErrorPage(domainName);
  }

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    return redirectToSessionExpiredPage(domainName);
  }

  try {
    const responseFromAuthorizeEndpoint = await getAuthorizationCode(
      queryParameters.client_id,
      queryParameters.redirect_uri,
      queryParameters.state,
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
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPage(domainName);
    }
    return redirectToErrorPage(domainName);
  }
};
