import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import nunjucks from "nunjucks";
import path from "node:path";
import logger from "../../commons/logger.js";
import mainPageTemplate from "./index.njk";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import {
  handleGetIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../domain/stored-identity/stored-identity-validator.js";
import { getSessionDetails } from "../../api/oauth-internal-api.js";
import { redirectToErrorPage } from "../../api/sis-api.js";
import { EVCSError, StoredIdentityValidationError } from "../../commons/errors.js";
import { HttpCodesEnum } from "../../commons/constants.js";
import { extractUserDetails } from "./user-details-content.js";
import translations from "../../../locales/en/translation.json" with { type: "json" };
import { EVCSIdentityResponse } from "../../api/evcs-api.js";
import { getJwtBody } from "../../commons/jwt-utilities.js";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { MetricDimension, MetricName } from "../../commons/metric-enum.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { calculateVot } from "../../domain/stored-identity/calculate-vot.js";
import { StoredIdentityRecord } from "../../domain/stored-identity/stored-identity-types.js";
import { hasIdentityExpired } from "../../domain/verifiable-credential/identity-expiry-service.js";

const govukFrontendDistribution = path.join(path.dirname(require.resolve("govuk-frontend/package.json")), "dist");
const nunjucksEnvironment = nunjucks.configure([
  process.env.LAMBDA_TASK_ROOT || "",
  govukFrontendDistribution,
  path.join(govukFrontendDistribution, "../.."),
]);

nunjucksEnvironment.addFilter("GDSDate", (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
});

export type ConfirmDetailsQueryStringParameters = {
  redirect_uri: string;
  client_id: string;
  state: string;
};

const metrics = new Metrics();

const validateUserIdentity = async (
  identityResponse: EVCSIdentityResponse,
  vtr: IdentityVectorOfTrust[]
): Promise<boolean> => {
  const { expired, fraudExpired, drivingLicenceExpired } = await hasIdentityExpired(
    identityResponse.vcs.map((vcObject) => vcObject.vc)
  );
  const content = getJwtBody<StoredIdentityRecord>(identityResponse.si.vc);
  const vot = calculateVot(content, identityResponse.si.unsignedVot, vtr);
  const votSufficient = vot !== "P0";

  metrics.addDimensions({
    [MetricDimension.FraudCheckExpired]: fraudExpired ? "fail" : "pass",
    [MetricDimension.DrivingLicenceExpired]: drivingLicenceExpired ? "fail" : "pass",
    [MetricDimension.VotSufficient]: votSufficient ? "pass" : "fail",
  });
  metrics.addMetric(MetricName.IdentityReuseValidation, "Count", 1);
  metrics.publishStoredMetrics();

  if (expired) {
    logger.error("User identity expired");
  }
  if (!votSufficient) {
    logger.error("Identity does not meet required level of confidence", { vtr });
  }

  return !expired && votSufficient;
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

    const { storageAccessToken, subject, vtr } = await getSessionDetails(sessionId);

    if (!storageAccessToken) {
      logger.error("No storageAccessToken returned from session endpoint");
      return redirectToErrorPage(domainName);
    }

    if (!vtr) {
      logger.error("No vtr value returned from session endpoint");
      return redirectToErrorPage(domainName);
    }

    const identityResponse = await handleGetIdentityFromCredentialStore(`Bearer ${storageAccessToken}`, subject);
    const { kidValid, signatureValid, isValid, storedIdentityRecord } = await validateStoredIdentity(identityResponse);

    if (!kidValid || !signatureValid || !isValid || !storedIdentityRecord) {
      logger.error("Record validation failed for existing user", { kidValid, signatureValid, isValid });
      return {
        statusCode: 500,
        body: "",
      };
    }

    const identityReuseValid = await validateUserIdentity(identityResponse, vtr);

    if (!identityReuseValid) {
      return redirectToErrorPage(domainName);
    }

    const userDetails = extractUserDetails(storedIdentityRecord);

    return {
      statusCode: 200,
      body: nunjucksEnvironment.render(mainPageTemplate, {
        assetPath: "./assets",
        rootPath: ".",
        redirect_uri,
        state,
        client_id,
        userDetails,
        translations,
        govukRebrand: true,
        errorPageUrl: `https://${domainName}/error/unrecoverable`,
      }),
      headers: {
        "content-type": "text/html",
      },
    };
  } catch (error) {
    if (error instanceof EVCSError && error.statusCode === HttpCodesEnum.NOT_FOUND) {
      logger.error("No identity record found in EVCS");
      return redirectToErrorPage(domainName);
    }
    if (error instanceof StoredIdentityValidationError) {
      return redirectToErrorPage(domainName);
    }
    logger.error(`Error in lambdaHandler event: ${error}`);
    return {
      statusCode: 500,
      body: "",
    };
  }
};
