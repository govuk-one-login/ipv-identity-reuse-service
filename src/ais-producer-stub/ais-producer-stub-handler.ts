import type { APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import sampleTemplate from "./index.njk";
import fs from "fs";

nunjucks.configure([require.resolve("govuk-frontend").replace(/\/dist\/govuk.*/, "/dist")]);

const sampleTemplateContents = fs.readFileSync(sampleTemplate, "utf8");

export const handler = async (): Promise<APIGatewayProxyResult> => ({
  statusCode: 200,
  body: nunjucks.renderString(sampleTemplateContents, {
    assetPath: "v1/assets",
    rootPath: "v1",
  }),
  headers: {
    "content-type": "text/html",
  },
});
