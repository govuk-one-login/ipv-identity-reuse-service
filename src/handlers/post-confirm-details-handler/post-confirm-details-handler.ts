import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventValues = new URLSearchParams(event.body || "");

  const redirectUri = eventValues.get("redirectUri");
  const clientId = eventValues.get("client_id");
  const state = eventValues.get("state");

  if (!redirectUri || !state || !clientId) {
    throw new Error("One or more required query string parameters are undefined");
  }

  const url = new URL(`https://${process.env.PUBLIC_API}/oauth2/callback`);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("state", state);
  url.searchParams.append("client_id", clientId);

  try {
    return {
      statusCode: 302,
      body: "",
      headers: {
        Location: url.href,
      },
    };
  } catch (error) {
    logger.error(`Error in lambdaHandler event: ${error}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
