import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";
import { URL } from "node:url";

export type OAuthBadRequest = {
  error: string;
  error_description: string;
};

export type AuthorizationQueryStringParameters = {
  client_id: string;
  response_type: string;
  redirect_uri: string;
  scope?: string;
};

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const {
    redirect_uri: redirectUri,
    response_type: responseType,
    scope,
  } = event.queryStringParameters as AuthorizationQueryStringParameters;

  if (responseType !== "code") {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Request parameter [response_type] must be of type 'code'",
      }),
    };
  }

  const url = new URL(decodeURIComponent(redirectUri));
  url.searchParams.append("code", "SplxlOBeZQQYbYS6WxSbIA");
  if (scope) {
    url.searchParams.append("scope", scope);
  }

  return {
    statusCode: 302,
    body: "",
    headers: {
      Location: url.href,
    },
  };
};
