import { URL } from "node:url";
import logger from "../commons/logger";
import { isValidAuthorizationSuccessResponse, isValidSessionSuccessResponse } from "./oauth-internal-service-response";
import { getOauthInternalApiUrl, getSessionTimeout } from "../commons/configuration";

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

const SESSION_TIMEOUT_MS = Number(getSessionTimeout());

export async function callSessionApi(clientId: string, request: string): Promise<SessionResult> {
  const oauthInternalApiUrl = getOauthInternalApiUrl();
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
    if (!isValidSessionSuccessResponse(sessionData)) {
      throw new CreateSessionError("Invalid response properties received from session endpoint");
    }
    return {
      session_id: sessionData.session_id,
      state: sessionData.state,
      redirect_uri: sessionData.redirect_uri,
    };
  } else {
    logger.error(`Session handler returned non-201 status: ${responseFromSessionEndpoint.status}`);
    throw new CreateSessionError("Session endpoint returned an error response");
  }
}

export async function getAuthorizationCode(
  clientId: string,
  redirectUri: string,
  state: string,
  sessionId: string
): Promise<AuthorizationResult> {
  const oauthInternalApiUrl = getOauthInternalApiUrl();
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
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });

  if (responseFromAuthorizeEndpoint.status === 200) {
    const authorizationData = await responseFromAuthorizeEndpoint.json();
    if (!isValidAuthorizationSuccessResponse(authorizationData)) {
      throw new Error("Invalid response properties received from authorization endpoint");
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
    logger.error(`${responseFromAuthorizeEndpoint.status} response code returned from the authorization endpoint`);
    throw new Error("Authorize endpoint returned an error response");
  }
}
