import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";
import { callSessionApi, SessionResult } from "../../services/oauth-internal-service";
import { redirectToConfirmDetails, redirectToErrorPage } from "../../services/sis-redirect-service";
import { getRequiredEnvironment } from "../../commons/get-required-environment";

export type AuthorizationQueryStringParameters = {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  request?: string;
};

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  logger.addContext(context);

  const {
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    request,
  } = event.queryStringParameters as AuthorizationQueryStringParameters;

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  if (request) {
    let response: SessionResult;
    try {
      response = await callSessionApi(clientId, request);
    } catch (error) {
      logger.error(`Error calling session handler: ${error}`);
      return redirectToErrorPage(domainName);
    }
    const cookie = buildSessionCookie(response.session_id);
    return redirectToConfirmDetails({
      domainName: domainName,
      state: response.state,
      redirectUri: response.redirect_uri,
      clientId: clientId,
      cookie: cookie,
    });
  }

  return redirectToConfirmDetails({
    domainName: domainName,
    state: state,
    redirectUri: redirectUri,
    clientId: clientId,
  });
}

function buildSessionCookie(sessionId: string): string {
  const SESSION_COOKIE_NAME = "identity_reuse_service_session";
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}
