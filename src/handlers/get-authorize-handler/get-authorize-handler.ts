import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger.js";
import { callSessionApi } from "../../api/oauth-internal-api.js";
import { redirectToConfirmDetails, redirectToErrorPage } from "../../api/sis-api.js";
import { getRequiredEnvironment } from "../../commons/get-required-environment.js";
import { isStringWithLength } from "../../commons/string-utilities.js";

export type AuthorizationQueryStringParameters = {
  client_id: string;
  request: string;
};

export async function handler(event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> {
  logger.addContext(context);

  const domainName = getRequiredEnvironment("DOMAIN_NAME");

  if (!isValidQueryParameters(event.queryStringParameters)) {
    logger.error("Parameters are invalid");
    return redirectToErrorPage(domainName);
  }

  try {
    const { client_id: clientId, request } = event.queryStringParameters;
    const response = await callSessionApi(clientId, request);
    const cookie = buildSessionCookie(response.session_id);

    return redirectToConfirmDetails(domainName, cookie);
  } catch (error) {
    logger.error(`Error calling session handler: ${error}`);
    return redirectToErrorPage(domainName);
  }
}

function buildSessionCookie(sessionId: string): string {
  const SESSION_COOKIE_NAME = "identity_reuse_service_session";
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}

export function isValidQueryParameters(object: unknown): object is AuthorizationQueryStringParameters {
  if (!object || typeof object !== "object") {
    return false;
  }

  return (
    "client_id" in object &&
    isStringWithLength(object.client_id) &&
    "request" in object &&
    isStringWithLength(object.request)
  );
}
