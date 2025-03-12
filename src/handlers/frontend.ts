import { APIGatewayProxyEventV2, APIGatewayProxyResult, Context } from 'aws-lambda';
import app from '../ui/app'

export const handler = async (
  event: APIGatewayProxyEventV2,
  context: Context
): Promise<APIGatewayProxyResult> => {
  console.log(JSON.stringify(event, null, 2));
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
        ...response.headers,
        'Content-Type': 'text/html; charset=utf-8',
      },
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};
