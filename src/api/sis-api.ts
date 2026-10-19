import { URL } from "node:url";

type RedirectOptions = {
  location: string;
  body: string;
  cookie?: string;
};

export function redirectToErrorPage(domainName: string) {
  return redirect({ location: `https://${domainName}/error/unrecoverable`, body: "" });
}

export function redirectToSessionExpiredPage(domainName: string) {
  return redirect({ location: `https://${domainName}/error/session-expired`, body: "" });
}

export function redirectToBadRequest(domainName: string) {
  return redirect({ location: `https://${domainName}/error/bad-request`, body: "" });
}

export function redirectToConfirmDetails(domainName: string, cookie?: string) {
  return redirect({ location: `https://${domainName}/confirm-details`, body: "", cookie: cookie });
}

export function redirectToClient(
  redirectUri: string,
  state: string,
  authorizationCode?: string,
  errorDescription?: string,
  error?: string
) {
  const orchestrationRedirectUrl = new URL(redirectUri);

  if (authorizationCode) {
    orchestrationRedirectUrl.searchParams.append("code", authorizationCode);
  } else {
    orchestrationRedirectUrl.searchParams.append("error", error!);
    orchestrationRedirectUrl.searchParams.append("error_description", errorDescription!);
  }
  orchestrationRedirectUrl.searchParams.append("state", state);

  return redirect({ location: `${orchestrationRedirectUrl}`, body: "" });
}

export function redirectToOauthCallBack() {
  return redirect({ location: `https://${process.env.PUBLIC_API}/oauth2/callback`, body: "" });
}

export function redirect({ location, body, cookie }: RedirectOptions) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      ...(cookie && { "Set-Cookie": cookie }),
    },
    body: body,
  };
}
