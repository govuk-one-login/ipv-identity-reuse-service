import { URL } from "node:url";
import { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";
import { getRequiredEnvironment } from "../commons/get-required-environment";

export type SessionResponse = {
  session_id: string;
  state: string;
  redirect_uri: string;
};

export async function callSessionApi(clientId: string, request: string): Promise<Response> {
  const oauthInternalApiUrl = getRequiredEnvironment("OAUTH_INTERNAL_API_URL");
  const SESSION_TIMEOUT_MS = 10_000;
  const url = new URL(`${oauthInternalApiUrl}/api/session`);

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

export async function getAuthorizationCode(
  queryParameters: APIGatewayProxyEventQueryStringParameters,
  sessionId: string
): Promise<Response> {
  const oauthInternalApiUrl = process.env.OAUTH_INTERNAL_API;
  const url = new URL(`${oauthInternalApiUrl}/api/authorization`);

  url.searchParams.append("client_id", queryParameters.client_id!);
  url.searchParams.append("redirect_uri", queryParameters.redirect_uri!);
  url.searchParams.append("state", queryParameters.state!);
  url.searchParams.append("response_type", "code");

  return await fetch(url, {
    method: "GET",
    headers: {
      "session-id": sessionId,
    },
  });
}
