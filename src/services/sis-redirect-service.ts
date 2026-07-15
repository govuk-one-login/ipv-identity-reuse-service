import { SessionResponse } from "./oauth-internal-service";
import { URL } from "node:url";
import {
  AuthorizationSuccessResponse,
  isValidSuccessResponse,
} from "../handlers/get-callback-handler/get-callback-response";
import logger from "../commons/logger";

const SESSION_COOKIE_NAME = "identity_reuse_service_session";

function buildSessionCookie(sessionId: string): string {
  const value = `${SESSION_COOKIE_NAME}=${sessionId}`;
  const attributes = "Path=/; Secure; HttpOnly; SameSite=Lax";
  return `${value}; ${attributes}`;
}

export async function redirectToErrorPage(domainName: string) {
  return await redirect(`https://${domainName}/error/unrecoverable`, "");
}

export async function redirectToConfirmDetailsWithCookie(domainName: string, sessionResponse: SessionResponse) {
  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", sessionResponse.state);
  url.searchParams.append("redirect_uri", sessionResponse.redirect_uri);

  return await redirect(url.href, "", true, sessionResponse.session_id);
}

export async function redirectToConfirmDetails(domainName: string, state: string, redirectUri: string) {
  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", redirectUri);

  return await redirect(url.href, "");
}

export async function redirectToClient(authorizationResponse: Response, domainName: string) {
  const authResponseJson = await authorizationResponse.json();
  if (!isValidSuccessResponse(authResponseJson)) {
    logger.error("Invalid response properties received from authorization endpoint");
    return await redirectToErrorPage(domainName);
  }

  const authorizationData = authResponseJson as AuthorizationSuccessResponse;
  const orchestrationRedirectUrl = new URL(decodeURIComponent(authorizationData.redirectionURI));
  orchestrationRedirectUrl.searchParams.append("code", authorizationData.authorizationCode.value);
  orchestrationRedirectUrl.searchParams.append("state", authorizationData.state.value);
  return redirect(`${orchestrationRedirectUrl}`, "");
}

export async function redirectToClientWithError(redirectUri: string, state: string) {
  const orchestrationRedirectUrl = new URL(redirectUri);
  orchestrationRedirectUrl.searchParams.append("error", "access_denied");
  // To be replaced with the state returned by the /authorization endpoint once it's added to the oauth-common response
  orchestrationRedirectUrl.searchParams.append("state", state);
  return redirect(`${orchestrationRedirectUrl}`, "");
}

export async function redirect(location: string, body: string, includeCookie = false, sessionId?: string) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      ...(includeCookie && { "Set-Cookie": buildSessionCookie(sessionId!) }),
    },
    body: body,
  };
}
