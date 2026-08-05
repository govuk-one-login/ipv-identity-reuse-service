import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";
import { getCookieValues } from "../../commons/cookie-utilities";
import { redirectToErrorPage } from "../../services/sis-redirect-service";

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventValues = new URLSearchParams(event.body || "");
  const domainName = process.env.DOMAIN_NAME || "";

  const redirectUri = eventValues.get("redirectUri");
  const clientId = eventValues.get("client_id");
  const state = eventValues.get("state");
  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");

  if (!redirectUri || !state || !clientId) {
    throw new Error("One or more required query string parameters are undefined");
  }
  if (!sessionId) {
    return redirectToErrorPage(domainName);
  }

  try {
    await createAuthCode(sessionId);

    const url = new URL(`https://${process.env.PUBLIC_API}/oauth2/callback`);
    url.searchParams.append("redirect_uri", redirectUri);
    url.searchParams.append("state", state);
    url.searchParams.append("client_id", clientId);

    return {
      statusCode: 302,
      body: "",
      headers: {
        Location: url.href,
      },
    };
  } catch (error) {
    logger.error(`Error in lambdaHandler event`, { error });
    return redirectToErrorPage(domainName);
  }
};

const createAuthCode = async (sessionId: string) => {
  const oauthInternalApiUrl = process.env.OAUTH_INTERNAL_API_URL;
  const url = new URL(`${oauthInternalApiUrl}/api/create-auth-code`);

  const responseFromCreateAuthCode = await fetch(url, {
    method: "POST",
    headers: {
      "session-id": sessionId,
    },
  });

  logger.info("Response from create-auth-code", { sessionId, statusCode: responseFromCreateAuthCode.status });
};
