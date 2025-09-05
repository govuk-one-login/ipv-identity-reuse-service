import logger from "../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.debug("Received message", { event: event.body });
  if (!event.body || event.body.includes("@")) {
    // this will be replaced in SPT-1513
    return {
      statusCode: 500,
      body: "",
    };
  }
  return {
    statusCode: 200,
    body: "",
  };
};
