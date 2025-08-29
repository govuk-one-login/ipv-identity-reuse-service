import { APIGatewayProxyEvent, APIGatewayProxyResultV2 } from "aws-lambda";
import { getConfiguration, getServiceApiKey } from "../services/configuration";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResultV2> => {
  const configuration = await getConfiguration();
  const serviceApiKey = await getServiceApiKey();

  console.log(`${configuration.evcsApiUrl}/healthcheck`, {
    headers: {
      ...event.headers,
      ...(serviceApiKey && { "x-api-key": serviceApiKey }),
    },
  });

  try {
    const result = await fetch(`${configuration.evcsApiUrl}/healthcheck`, {
      method: "GET",
      headers: {
        ...event.headers,
        ...(serviceApiKey && { "x-api-key": serviceApiKey }),
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: error.message,
          stack: error.stack,
          name: error.name,
          cause: error.cause,
        }),
      };
    }
    return {
      statusCode: 400,
      body: String(error),
    };
  }
};
