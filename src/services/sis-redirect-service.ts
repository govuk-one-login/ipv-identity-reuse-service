import { URL } from "node:url";

type RedirectOptions = {
  location: string;
  body: string;
  cookie?: string;
};

type ConfirmDetailsRedirectOptions = {
  domainName: string;
  state: string;
  redirectUri: string;
  clientId: string;
  cookie?: string;
};

export function redirectToErrorPage(domainName: string) {
  return redirect({ location: `https://${domainName}/error/unrecoverable`, body: "" });
}

export function redirectToConfirmDetails({
  domainName,
  state,
  redirectUri,
  clientId,
  cookie,
}: ConfirmDetailsRedirectOptions) {
  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("client_id", clientId);

  return redirect({ location: url.href, body: "", cookie: cookie });
}

export function redirectToClient(redirectUri: string, state: string, authorizationCode?: string) {
  const orchestrationRedirectUrl = new URL(redirectUri);

  if (authorizationCode) {
    orchestrationRedirectUrl.searchParams.append("code", authorizationCode);
  } else {
    orchestrationRedirectUrl.searchParams.append("error", "access_denied");
  }
  orchestrationRedirectUrl.searchParams.append("state", state);

  return redirect({ location: `${orchestrationRedirectUrl}`, body: "" });
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
