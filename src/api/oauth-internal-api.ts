import { URL } from "node:url";
import logger from "../commons/logger.js";
import { getOauthInternalApiUrl, getSessionTimeout } from "../commons/configuration.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";

export type SessionResult = {
  session_id: string;
  state: string;
  redirect_uri: string;
};

export type GetSessionResult = {
  storageAccessToken?: string;
  subject: string;
  vtr?: IdentityVectorOfTrust[];
};

type AuthorizationResult = {
  authorizationCode?: string;
  redirect_uri: string;
  state: string;
  message?: string;
  code?: string;
};

type AuthorizationSuccessResponse = {
  redirectionURI: string;
  authorizationCode: { value: string };
  state: { value: string };
};

type AuthorizationErrorResponse = {
  redirectionUri: string;
  state: string;
  message: string;
  code: string;
};

type SessionSuccessResponse = {
  session_id: string;
  state: string;
  redirect_uri: string;
};

type GetSessionSuccessResponse = {
  vtr?: IdentityVectorOfTrust[];
  storageAccessToken?: string;
  clientSessionId: string;
  persistentSessionId?: string;
  subject: string;
  context?: string;
  sessionData?: object;
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
    const errorData = await responseFromAuthorizeEndpoint.json();
    if (!isValidAuthorizationErrorResponse(errorData)) {
      throw new Error("Invalid response properties received from authorization error response");
    }
    const orchestrationRedirectUrl = new URL(errorData.redirectionUri);
    return {
      redirect_uri: orchestrationRedirectUrl.href,
      state: errorData.state,
      message: errorData.message,
      code: errorData.code,
    };
  } else {
    logger.error(`${responseFromAuthorizeEndpoint.status} response code returned from the authorization endpoint`);
    throw new Error("Authorize endpoint returned an error response");
  }
}

export async function getSessionDetails(sessionId: string): Promise<GetSessionResult> {
  const oauthInternalApiUrl = getOauthInternalApiUrl();
  const url = new URL(`${oauthInternalApiUrl}/api/session`);

  const responseFromSessionEndpoint = await fetch(url, {
    method: "GET",
    headers: {
      "session-id": sessionId,
    },
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });

  if (responseFromSessionEndpoint.status === 200) {
    const sessionData = await responseFromSessionEndpoint.json();
    if (!isValidGetSessionSuccessResponse(sessionData)) {
      throw new Error("Invalid response properties received from GET session endpoint");
    }
    return {
      storageAccessToken: sessionData.storageAccessToken,
      subject: sessionData.subject,
      vtr: sessionData.vtr,
    };
  } else {
    logger.error(`GET session handler returned non-200 status: ${responseFromSessionEndpoint.status}`);
    throw new Error("GET session endpoint returned an error response");
  }
}

export async function updateSessionData(sessionId: string, data: Record<string, string | null>): Promise<void> {
  const oauthInternalApiUrl = getOauthInternalApiUrl();
  const url = new URL(`${oauthInternalApiUrl}/api/session`);

  const responseFromSessionEndpoint = await fetch(url, {
    method: "PATCH",
    headers: {
      "session-id": sessionId,
    },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
  });

  if (responseFromSessionEndpoint.status !== 200) {
    logger.error(`PATCH session handler returned non-200 status: ${responseFromSessionEndpoint.status}`);
    throw new Error("PATCH session endpoint returned an error response");
  }
}

function isValidAuthorizationSuccessResponse(object: unknown): object is AuthorizationSuccessResponse {
  if (!object || typeof object !== "object") return false;
  return (
    hasNonEmptyString(object, "redirectionURI") &&
    hasObjectWithNonEmptyValue(object, "authorizationCode") &&
    hasObjectWithNonEmptyValue(object, "state")
  );
}

function isValidAuthorizationErrorResponse(object: unknown): object is AuthorizationErrorResponse {
  if (!object || typeof object !== "object") return false;
  return (
    hasNonEmptyString(object, "redirectionUri") &&
    hasNonEmptyString(object, "state") &&
    hasNonEmptyString(object, "code")
  );
}

function isValidSessionSuccessResponse(object: unknown): object is SessionSuccessResponse {
  if (!object || typeof object !== "object") return false;
  return (
    hasNonEmptyString(object, "redirect_uri") &&
    hasNonEmptyString(object, "session_id") &&
    hasNonEmptyString(object, "state")
  );
}

function isValidGetSessionSuccessResponse(object: unknown): object is GetSessionSuccessResponse {
  if (!object || typeof object !== "object") return false;
  return hasNonEmptyString(object, "clientSessionId") && hasNonEmptyString(object, "subject");
}

function hasNonEmptyString(object: object, key: string): boolean {
  return (
    key in object &&
    typeof (object as Record<string, unknown>)[key] === "string" &&
    ((object as Record<string, unknown>)[key] as string).trim().length > 0
  );
}

function hasObjectWithNonEmptyValue(object: object, key: string): boolean {
  return (
    key in object &&
    !!(object as Record<string, unknown>)[key] &&
    typeof (object as Record<string, unknown>)[key] === "object" &&
    hasNonEmptyString((object as Record<string, unknown>)[key] as object, "value")
  );
}
