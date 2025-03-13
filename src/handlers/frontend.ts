import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import app from '../ui/app'
import { Logger } from '@aws-lambda-powertools/logger';
const logger = new Logger();

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.info("received event", { event });
  try {

    const proxyEvent = {
      body: JSON.parse(event.body || '{}'),
      headers: event.headers || {},
      httpMethod: event.requestContext.http.method || 'GET',
      path: event.requestContext.http.path,
      queryStringParameters: event.queryStringParameters,
    };

    const response = await app.inject(proxyEvent);

    return {
      statusCode: response.statusCode,
      body: response.payload,
      headers: {
        ...response.headers as Record<string, string>,
        'Content-Type': 'text/html; charset=utf-8',
      },
    };
  } catch (error) {
    logger.error("app error", { error });
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};
