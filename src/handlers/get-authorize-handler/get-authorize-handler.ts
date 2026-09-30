import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { callSessionApi, SessionResult } from "../../api/oauth-internal-api.js";
import { redirectToConfirmDetails, redirectToErrorPage } from "../../api/sis-api.js";
import { getRequiredEnvironment } from "../../commons/get-required-environment.js";
import {
  type AuthorizationQueryStringParameters,
  isValidQueryParameters,
} from "../../domain/authorization/authorization-types.js";

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  logger.addContext(context);

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  if (!isValidQueryParameters(event.queryStringParameters)) {
    logger.error("Parameters are invalid");
    return redirectToErrorPage(domainName);
  }

  const { client_id: clientId, request } = event.queryStringParameters as AuthorizationQueryStringParameters;

  if (request) {
    let response: SessionResult;
    try {
      response = await callSessionApi(clientId, request);
    } catch (error) {
      logger.error(`Error calling session handler: ${error}`);
      return redirectToErrorPage(domainName);
    }
    const cookie = buildSessionCookie(response.session_id);
    return redirectToConfirmDetails(domainName, cookie);
  }

  return redirectToConfirmDetails(domainName);
}

function buildSessionCookie(sessionId: string): string {
  const SESSION_COOKIE_NAME = "identity_reuse_service_session";
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}
