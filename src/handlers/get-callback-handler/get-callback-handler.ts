import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";
import { URL } from "node:url";
import { getCookieValues } from "../../commons/cookie-utilities";
import { AuthorizationSuccessResponse, isValidSuccessResponse } from "./get-callback-response";
import { isValidQueryParameters } from "./get-callback-request";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const queryParameters = event.queryStringParameters || {};

  const domainName = process.env.DOMAIN_NAME || "";

  if (!isValidQueryParameters(queryParameters)) {
    logger.error("Missing mandatory query string parameters to the GetCallbackHandler");
    return await redirectToErrorPage(domainName);
  }

  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");

  if (!sessionId) {
    return await redirectToErrorPage(domainName);
  }

  const oauthInternalApiUrl = process.env.OAUTH_INTERNAL_API;
  const url = new URL(`${oauthInternalApiUrl}/api/authorization`);

  url.searchParams.append("client_id", queryParameters.client_id);
  url.searchParams.append("redirect_uri", queryParameters.redirect_uri);
  url.searchParams.append("response_type", "code");

  try {
    const responseFromAuthorizeEndpoint = await fetch(url, {
      method: "GET",
      headers: {
        "session-id": sessionId,
      },
    });

    if (responseFromAuthorizeEndpoint.status === 200) {
      return await redirectToClient(responseFromAuthorizeEndpoint, domainName);
    } else if (responseFromAuthorizeEndpoint.status === 403) {
      return await redirectToClientWithError(queryParameters.redirect_uri, queryParameters.state);
    } else {
      logger.error(`${responseFromAuthorizeEndpoint.status} response code returned from the authorization endpoint`);
      return await redirectToErrorPage(domainName);
    }
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    return await redirectToErrorPage(domainName);
  }
};

const redirectToClient = async (authorizationResponse: Response, domainName: string) => {
  if (!isValidSuccessResponse(await authorizationResponse.json())) {
    logger.error("Invalid response properties received from authorization endpoint");
    return await redirectToErrorPage(domainName);
  }

  const authorizationData = (await authorizationResponse.json()) as AuthorizationSuccessResponse;
  const orchestrationRedirectUrl = new URL(decodeURIComponent(authorizationData.redirectionURI));
  orchestrationRedirectUrl.searchParams.append("code", authorizationData.authorizationCode.value);
  orchestrationRedirectUrl.searchParams.append("state", authorizationData.state.value);
  return redirect(`${orchestrationRedirectUrl}`);
};

const redirectToClientWithError = async (redirectUri: string, state: string) => {
  const orchestrationRedirectUrl = new URL(redirectUri);
  orchestrationRedirectUrl.searchParams.append("error", "access_denied");
  // To be replaced with the state returned by the /authorization endpoint once it's added to the oauth-common response
  orchestrationRedirectUrl.searchParams.append("state", state);
  return redirect(`${orchestrationRedirectUrl}`);
};

const redirectToErrorPage = async (domainName: string) => {
  return await redirect(`https://${domainName}/error/unrecoverable`);
};

const redirect = async (location: string) => {
  return {
    statusCode: 302,
    headers: {
      Location: location,
    },
    body: "",
  };
};
