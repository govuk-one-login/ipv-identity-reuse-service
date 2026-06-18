import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";
import { URL } from "node:url";
import Cookies from "js-cookie";

export type AuthorizationQueryStringParameters = {
  redirect_uri: string;
  state: string;
  client_id: string;
};

interface AuthorizationSuccessResponse {
  redirectionURI: string;
  authorizationCode: { value: string };
  state: { value: string } | object;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const {
    redirect_uri: redirectUri,
    state,
    client_id,
  } = event.queryStringParameters as AuthorizationQueryStringParameters;

  // Currently a test value will be used for session-id in the cookie. The actual value will be implemented in the next ticket
  const sessionId = Cookies.get("identity_reuse_service_session") || "b18a07d1-9a29-466f-bf90-a61387c6de77";

  const domainName = process.env.DOMAIN_NAME || "";
  const oauthInternalApiUrl = process.env.OAUTH_INTERNAL_API;
  const url = new URL(`${oauthInternalApiUrl}/api/authorization`);

  url.searchParams.append("client_id", client_id);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");

  try {
    const responseFromAuthorizeEndpoint = await fetch(url, {
      method: "GET",
      headers: {
        // session-id has been faked since we haven't implemented that change to generate it yet
        "session-id": sessionId,
      },
    });

    if (responseFromAuthorizeEndpoint.status === 200) {
      const authorizationData = (await responseFromAuthorizeEndpoint.json()) as AuthorizationSuccessResponse;
      const orchestrationRedirectUrl = new URL(decodeURIComponent(authorizationData.redirectionURI));
      orchestrationRedirectUrl.searchParams.append("code", authorizationData.authorizationCode.value);
      if ("value" in authorizationData.state) {
        orchestrationRedirectUrl.searchParams.append("state", authorizationData.state.value);
      } else {
        orchestrationRedirectUrl.searchParams.append("state", "");
      }
      return {
        statusCode: 302,
        headers: {
          Location: `${orchestrationRedirectUrl}`,
        },
        body: "",
      };
    } else if (responseFromAuthorizeEndpoint.status === 403) {
      const orchestrationRedirectUrl = new URL(redirectUri);
      orchestrationRedirectUrl.searchParams.append("error", "access_denied");
      // To be replaced with the state returned by the /authorization endpoint once it's added to the oauth-common response
      orchestrationRedirectUrl.searchParams.append("state", state);
      return {
        statusCode: 302,
        headers: {
          Location: `${orchestrationRedirectUrl}`,
        },
        body: "",
      };
    } else {
      return {
        statusCode: 302,
        headers: {
          Location: `https://${domainName}/error/unrecoverable`,
        },
        body: "",
      };
    }
  } catch (error) {
    logger.error(`Error in OAuth Callback handler event: ${error}`);
    return {
      statusCode: 302,
      headers: {
        Location: `https://${domainName}/error/unrecoverable`,
      },
      body: "",
    };
  }
};
