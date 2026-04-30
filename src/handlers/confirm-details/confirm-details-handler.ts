import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger";

const govukFrontendDist = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnv = nunjucks.configure([__dirname, govukFrontendDist]);

export type ConfirmDetailsQueryStringParameters = {
  code: string;
  redirect_uri: string;
  state: string;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { code, redirect_uri, state } = event.queryStringParameters as ConfirmDetailsQueryStringParameters;
  if (!code || !redirect_uri || !state) {
    throw new Error("One or more required query string parameters are undefined or empty");
  }
  try {
    return {
      statusCode: 200,
      body: nunjucksEnv.render("index.njk", {
        assetPath: "./assets",
        rootPath: ".",
        code,
        redirect_uri,
        state,
      }),
      headers: {
        "content-type": "text/html",
      },
    };
  } catch (err) {
    logger.error(`Error in lambdaHandler event: ${err}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
