import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const eventValues = new URLSearchParams(event.body || "");

  const redirectUri = eventValues.get("redirectUri");
  const code = eventValues.get("code");
  const state = eventValues.get("state");

  if (!redirectUri || !code || !state) {
    throw new Error("One or more required query string parameters are undefined");
  }

  const url = new URL(decodeURIComponent(eventValues.get("redirectUri") || ""));
  url.searchParams.append("code", eventValues.get("code") || "");
  url.searchParams.append("state", eventValues.get("state") || "");

  try {
    return {
      statusCode: 302,
      body: "",
      headers: {
        Location: url.href,
      },
    };
  } catch (err) {
    logger.error(`Error in lambdaHandler event: ${err}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
