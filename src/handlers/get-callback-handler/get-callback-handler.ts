import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import { isValidQueryParameters } from "./get-callback-types.js";
import { getAuthorizationCode } from "../../api/oauth-internal-api.js";
import { redirectToClient, redirectToErrorPage } from "../../api/sis-api.js";
import { getRequiredEnvironment } from "../../commons/get-required-environment.js";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const queryParameters = event.queryStringParameters || {};

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  if (!isValidQueryParameters(queryParameters)) {
    logger.error("Missing mandatory query string parameters to the GetCallbackHandler");
    return redirectToErrorPage(domainName);
  }

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  if (!sessionId) {
    return redirectToErrorPage(domainName);
  }

  try {
    const responseFromAuthorizeEndpoint = await getAuthorizationCode(
      queryParameters.client_id,
      queryParameters.redirect_uri,
      queryParameters.state,
      sessionId
    );

<<<<<<< HEAD
    return redirectToClient({
      redirectUri: responseFromAuthorizeEndpoint.redirect_uri,
      state: responseFromAuthorizeEndpoint.state,
      authorizationCode: responseFromAuthorizeEndpoint.authorizationCode,
      errorDescription: responseFromAuthorizeEndpoint.message,
      error: responseFromAuthorizeEndpoint.code,
    });
=======
    return redirectToClient(
      responseFromAuthorizeEndpoint.redirect_uri,
      responseFromAuthorizeEndpoint.state,
      responseFromAuthorizeEndpoint.authorizationCode
    );
>>>>>>> 8d1e1cd (SPT-1912: Updated unit tests and refactored)
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    return redirectToErrorPage(domainName);
  }
};
