import { APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger";
import mainPageTemplate from "./index.njk";

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution]);

export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: 200,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "/assets",
        rootPath: "",
      }),
      headers: {
        "content-type": "text/html",
      },
    };
  } catch (error) {
    logger.error(`Error in lambdaHandler event: ${error}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
