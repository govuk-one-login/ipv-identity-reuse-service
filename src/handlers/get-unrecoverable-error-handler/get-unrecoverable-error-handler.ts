import { APIGatewayProxyResult, APIGatewayProxyEvent, Context } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../utilities/logger.js";
import mainPageTemplate from "./index.njk";

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution]);

export const lambdaHandler = async (
  request: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);
  try {
    return {
      statusCode: 500,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "/assets",
        baseUrl: request.resource,
        rootPath: "",
        govukRebrand: true,
      }),
      headers: {
        "content-type": "text/html",
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error("Error in lambdaHandler event", { message: error.message, name: error.name });
    } else {
      logger.error("Error in lambdaHandler event", { error });
    }

    return {
      statusCode: 500,
      body: "",
    };
  }
};
