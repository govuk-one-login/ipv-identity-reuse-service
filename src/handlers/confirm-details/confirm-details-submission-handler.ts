import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import logger from "../../commons/logger";

const extractEventData = async (eventBody: string[]) => {
  const obj: Record<string, string> = {};
  for (const value of eventBody) {
    const key = value.substring(0, value.indexOf("="));
    const start = value.indexOf("=") + 1;
    obj[key] = value.slice(start);
  }
  return obj;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const valuesArray = event.body!.split("&");
  const parameterValues = await extractEventData(valuesArray);
  const redirectUrl = parameterValues["redirectUri"];
  const start2 = valuesArray[1].indexOf("=") + 1;
  const authCode = valuesArray[1].slice(start2);
  const start3 = valuesArray[2].indexOf("=") + 1;
  const state = valuesArray[2].slice(start3);

  const url = new URL(decodeURIComponent(redirectUrl));
  url.searchParams.append("code", authCode);
  url.searchParams.append("state", state);

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
      body: JSON.stringify({
        message: err,
      }),
    };
  }
};
