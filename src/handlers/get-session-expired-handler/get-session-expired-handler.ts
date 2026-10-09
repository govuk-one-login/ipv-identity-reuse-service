import { APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger.js";
import mainPageTemplate from "./index.njk";
import translations from "../../../locales/en/translation.json" with { type: "json" };

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution]);

export const lambdaHandler = async (): Promise<APIGatewayProxyResult> => {
  try {
    return {
      statusCode: 401,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "/assets",
        rootPath: "",
        govukRebrand: true,
        translations,
      }),
      headers: {
        "content-type": "text/html",
      },
    };
  } catch (error) {
    logger.error(`Error in get session expired lambdaHandler event: ${error}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
