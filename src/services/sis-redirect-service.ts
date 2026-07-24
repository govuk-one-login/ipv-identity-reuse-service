import { URL } from "node:url";

type redirectOptions = {
  location: string;
  body: string;
  cookie?: string;
};

export function redirectToErrorPage(domainName: string) {
  return redirect({ location: `https://${domainName}/error/unrecoverable`, body: "" });
}

export function redirectToConfirmDetails(domainName: string, state: string, redirectUri: string, cookie?: string) {
  const url = new URL("/confirm-details", `https://${domainName}`);
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", redirectUri);

  return cookie
    ? redirect({ location: url.href, body: "", cookie: cookie })
    : redirect({ location: url.href, body: "" });
}

export function redirectToClient(redirectUri: string, state: string, authorizationCode?: string) {
  const orchestrationRedirectUrl = new URL(decodeURIComponent(redirectUri));
  orchestrationRedirectUrl.searchParams.append("state", state);

  if (authorizationCode) {
    orchestrationRedirectUrl.searchParams.append("code", authorizationCode);
  } else {
    orchestrationRedirectUrl.searchParams.append("error", "access_denied");
  }
  orchestrationRedirectUrl.searchParams.sort();
  return redirect({ location: `${orchestrationRedirectUrl}`, body: "" });
}

export function redirect({ location, body, cookie }: redirectOptions) {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      ...(cookie && { "Set-Cookie": cookie }),
    },
    body: body,
  };
}
