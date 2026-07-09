import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";
import { getRequiredEnvironment } from "../../commons/get-required-environment";
import { URL } from "node:url";

export type AuthorizationQueryStringParameters = {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope?: string;
  state: string;
  request?: string;
};

type SessionResponse = {
  session_id: string;
  state: string;
  redirect_uri: string;
};

const SESSION_TIMEOUT_MS = 10_000;
const SESSION_COOKIE_NAME = "identity_reuse_service_session";

function buildSessionCookie(sessionId: string): string {
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}

function redirectToError(domainName: string): APIGatewayProxyResult {
  const url = new URL("/error/unrecoverable", `https://${domainName}`);

  return {
    statusCode: 302,
    body: "",
    headers: {
      Location: url.href,
    },
  };
}

function redirectToConfirmDetails(domainName: string, sessionResponse: SessionResponse): APIGatewayProxyResult {
  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", sessionResponse.state);
  url.searchParams.append("redirect_uri", sessionResponse.redirect_uri);

  return {
    statusCode: 302,
    body: "",
    headers: {
      Location: url.href,
      "Set-Cookie": buildSessionCookie(sessionResponse.session_id),
    },
  };
}

async function callSessionApi(apiUrl: string, clientId: string, request: string): Promise<Response> {
  const url = new URL(`${apiUrl}/api/session`);

  const body = JSON.stringify({
    client_id: clientId,
    request,
  });

  return fetch(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });
}

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
    return createSession(clientId, request, domainName);
  }

  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", redirectUri);

  return {
    statusCode: 302,
    body: "",
    headers: {
      Location: url.href,
    },
  };
}

async function createSession(clientId: string, request: string, domainName: string): Promise<APIGatewayProxyResult> {
  const oauthInternalApiUrl = getRequiredEnvironment("OAUTH_INTERNAL_API_URL");

  let response: Response;
  try {
    response = await callSessionApi(oauthInternalApiUrl, clientId, request);
  } catch (error) {
    logger.error(`Error calling session handler: ${error}`);
    return redirectToError(domainName);
  }

  if (response.status !== 201) {
    logger.error(`Session handler returned non-201 status: ${response.status}`);
    return redirectToError(domainName);
  }

  const sessionResponse: SessionResponse = await response.json();

  return redirectToConfirmDetails(domainName, sessionResponse);
}
