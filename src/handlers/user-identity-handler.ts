import logger from "../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HTTP_MESSAGE_INVALID_REQUEST, HttpCodesEnum } from "../types/constants";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.debug("Received message", { event: event.body });
  if (!event.body) {
    return {
      statusCode: HttpCodesEnum.BAD_REQUEST,
      body: JSON.stringify({ message: HTTP_MESSAGE_INVALID_REQUEST }),
    };
  }
  if (!event?.headers?.Authorization) {
    return {
      statusCode: HttpCodesEnum.UNAUTHORIZED,
      body: JSON.stringify({ message: "Request Unauthorized" }),
    };
  }

  try {
    JSON.parse(JSON.stringify(event.body));
  } catch {
    return {
      statusCode: HttpCodesEnum.BAD_REQUEST,
      body: JSON.stringify({ message: "Event body is not valid JSON" }),
    };
  }

  return {
    statusCode: HttpCodesEnum.OK,
    body: JSON.stringify({ message: "Request Success" }),
  };
};
