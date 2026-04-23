import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import confirmDetailsTemplate from "./index.njk";
import fs from "node:fs";
import logger from "../../commons/logger";

nunjucks.configure([require.resolve("govuk-frontend").replace(/\/dist\/govuk.*/, "/dist")]);

const confirmDetailsTemplateContents = fs.readFileSync(confirmDetailsTemplate, "utf8");

export type ConfirmDetailsQueryStringParameters = {
  code: string;
  redirect_uri: string;
  state: string;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { code, redirect_uri, state } = event.queryStringParameters as ConfirmDetailsQueryStringParameters;
  try {
    return {
      statusCode: 200,
      body: nunjucks.renderString(confirmDetailsTemplateContents, {
        assetPath: "./assets",
        rootPath: ".",
        code,
        redirect_uri,
        state,
      }),
      headers: {
        "content-type": "text/html",
        code: code,
      },
    };
  } catch (err) {
    logger.error(`Error in lambdaHandler event: ${err}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: err,
      }),
    };
  }
};
