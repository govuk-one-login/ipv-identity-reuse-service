import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger";
import mainPageTemplate from "./index.njk";

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution]);

export type ConfirmDetailsQueryStringParameters = {
  redirect_uri: string;
  state: string;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { redirect_uri, state } = event.queryStringParameters as ConfirmDetailsQueryStringParameters;
  if (!redirect_uri || !state) {
    throw new Error("One or more required query string parameters are undefined or empty");
  }
  try {
    return {
      statusCode: 200,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "./assets",
        rootPath: ".",
        redirect_uri,
        state,
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
