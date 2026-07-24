import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";
import { getRequiredEnvironment } from "../../commons/get-required-environment";
import { callSessionApi, SessionResult } from "../../services/oauth-internal-service";
import { redirectToConfirmDetails, redirectToErrorPage } from "../../services/sis-redirect-service";

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
    return redirectToConfirmDetails(domainName, response.state, response.redirect_uri, cookie);
  }

  return redirectToConfirmDetails(domainName, state, redirectUri);
}

function buildSessionCookie(sessionId: string): string {
  const SESSION_COOKIE_NAME = "identity_reuse_service_session";
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}
