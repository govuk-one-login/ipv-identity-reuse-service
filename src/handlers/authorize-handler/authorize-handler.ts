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
  state: string;
};

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  const { redirect_uri: redirectUri, state } = event.queryStringParameters as AuthorizationQueryStringParameters;

  const domainName = process.env.DOMAIN_NAME || "";
  const url = new URL(`https://${domainName}/confirm-details`);
  url.searchParams.append("code", "SplxlOBeZQQYbYS6WxSbIA");
  url.searchParams.append("state", state);
  url.searchParams.append("redirect_uri", redirectUri);

  return {
    statusCode: 302,
    body: "",
    headers: {
      Location: url.href,
    },
  };
};
