import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger";
import mainPageTemplate from "./index.njk";
import { getProperty } from "../../commons/case-insensitive-header-utilities";
import { TokenValidationError } from "../../commons/errors";
import { HttpCodesEnum } from "../../commons/constants";
import {
  getUserIdFromJwt,
  handleGetIdentityFromCredentialStore,
  validateIdentityRecords,
} from "../../commons/validate-records";

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([process.env.LAMBDA_TASK_ROOT || "", govukFrontendDistribution]);

export type ConfirmDetailsQueryStringParameters = {
  redirect_uri: string;
  client_id: string;
  state: string;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { redirect_uri, client_id, state } = event.queryStringParameters as ConfirmDetailsQueryStringParameters;
  if (!redirect_uri || !state || !client_id) {
    throw new Error("One or more required query string parameters are undefined or empty");
  }

  const authorisation = getProperty(event?.headers, "authorization");
  try {
    if (!authorisation) throw new TokenValidationError(HttpCodesEnum.UNAUTHORIZED);

    const subject = getUserIdFromJwt(authorisation);
    const identityResponse = await handleGetIdentityFromCredentialStore(authorisation, subject);
    const { kidValid, signatureValid, isValid } = await validateIdentityRecords(identityResponse);

    if (!kidValid || !signatureValid || !isValid) {
      logger.error("Record validation failed for existing user", { kidValid, signatureValid, isValid });
      return {
        statusCode: 500,
        body: "",
      };
    }
    return {
      statusCode: 200,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "./assets",
        rootPath: ".",
        redirect_uri,
        state,
        client_id,
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
