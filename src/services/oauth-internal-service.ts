import { URL } from "node:url";
import { getRequiredEnvironment } from "../commons/get-required-environment";
import logger from "../commons/logger";
import { isValidSuccessResponse } from "./oauth-internal-service-response";

export type SessionResult = {
  session_id: string;
  state: string;
  redirect_uri: string;
};

type AuthorizationResult = {
  authorizationCode?: string;
  redirect_uri: string;
  state: string;
};

export class CreateSessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CreateSessionError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function callSessionApi(clientId: string, request: string): Promise<SessionResult> {
  const oauthInternalApiUrl = getRequiredEnvironment("OAUTH_INTERNAL_API_URL");
  const SESSION_TIMEOUT_MS = 10_000;
  const url = new URL(`${oauthInternalApiUrl}/api/session`);

  const body = JSON.stringify({
    client_id: clientId,
    request,
  });

  const responseFromSessionEndpoint = await fetch(url.href, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });

  if (responseFromSessionEndpoint.status === 201) {
    const sessionData = await responseFromSessionEndpoint.json();
    return {
      session_id: sessionData.session_id,
      state: sessionData.state,
      redirect_uri: sessionData.redirect_uri,
    };
  } else {
    throw new CreateSessionError("Session endpoint returned an error response");
  }
}

export async function getAuthorizationCode(
  clientId: string,
  redirectUri: string,
  state: string,
  sessionId: string
): Promise<AuthorizationResult> {
  const oauthInternalApiUrl = getRequiredEnvironment("OAUTH_INTERNAL_API_URL");
  const url = new URL(`${oauthInternalApiUrl}/api/authorization`);

  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("response_type", "code");

  const responseFromAuthorizeEndpoint = await fetch(url, {
    method: "GET",
    headers: {
      "session-id": sessionId,
    },
  });

  if (responseFromAuthorizeEndpoint.status === 200) {
    const authorizationData = await responseFromAuthorizeEndpoint.json();
    if (!isValidSuccessResponse(authorizationData)) {
      logger.error("Invalid response properties received from authorization endpoint");
      throw new Error("Invalid response properties received from authorization endpoint");
    }

    if (Object.keys(authorizationData.state).length === 0) {
      logger.error("Response from Authorization API call missing state value");
      throw new Error("Response from Authorization API call missing state value");
    }
    const orchestrationRedirectUrl = new URL(decodeURIComponent(authorizationData.redirectionURI));
    return {
      authorizationCode: authorizationData.authorizationCode.value,
      redirect_uri: orchestrationRedirectUrl.href,
      state: authorizationData.state.value,
    };
  } else if (responseFromAuthorizeEndpoint.status === 403) {
    const orchestrationRedirectUrl = new URL(redirectUri);
    return {
      redirect_uri: orchestrationRedirectUrl.href,
      state: state,
    };
  } else {
    throw new Error("Authorize endpoint returned an error response");
  }
}
