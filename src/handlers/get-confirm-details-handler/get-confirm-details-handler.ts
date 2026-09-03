import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger";
import mainPageTemplate from "./index.njk";
import { getCookieValues } from "../../commons/cookie-utilities";
import { handleGetIdentityFromCredentialStore, validateIdentityRecords } from "../../commons/validate-records";
import { getSessionDetails } from "../../services/oauth-internal-service";
import { redirectToErrorPage } from "../../services/sis-redirect-service";
import { CredentialStoreError } from "../../commons/errors";
import { HttpCodesEnum } from "../../commons/constants";

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

  const domainName = process.env.DOMAIN_NAME || "";
  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");
  try {
    if (!sessionId) {
      logger.error("Session cookie not found");
      return redirectToErrorPage(domainName);
    }

    const { storageAccessToken, subject } = await getSessionDetails(sessionId);

    if (!storageAccessToken) {
      logger.error("No storageAccessToken returned from session endpoint");
      return redirectToErrorPage(domainName);
    }

    const identityResponse = await handleGetIdentityFromCredentialStore(`Bearer ${storageAccessToken}`, subject);
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
    if (error instanceof CredentialStoreError && error.statusCode === HttpCodesEnum.NOT_FOUND) {
      logger.error("No identity record found in EVCS");
      return redirectToErrorPage(domainName);
    }
    logger.error(`Error in lambdaHandler event: ${error}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
