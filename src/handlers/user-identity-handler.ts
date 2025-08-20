import logger from '../commons/logger.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.debug('Received message', { event: event.body });
  return {
    statusCode: 202,
    body: '',
  };
};
