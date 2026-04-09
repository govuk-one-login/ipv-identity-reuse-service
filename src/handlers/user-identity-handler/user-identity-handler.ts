import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import logger from "../../commons/logger";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

  return {
    statusCode: 200,
    body: "{}",
  };
};
