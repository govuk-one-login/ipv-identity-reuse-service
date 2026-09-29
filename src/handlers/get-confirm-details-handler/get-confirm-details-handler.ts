import { Metrics } from "@aws-lambda-powertools/metrics";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import path from "node:path";
import nunjucks from "nunjucks";
import translations from "../../../locales/en/translation.json" with { type: "json" };
import { getSessionDetails, updateSessionData } from "../../api/oauth-internal-api.js";
import { redirectToErrorPage, redirectToOauthCallBack } from "../../api/sis-api.js";
import { HttpCodesEnum } from "../../commons/constants.js";
import { getCookieValues } from "../../commons/cookie-utilities.js";
import { EVCSError, StoredIdentityValidationError } from "../../commons/errors.js";
import { getJwtBody } from "../../commons/jwt-utilities.js";
import logger from "../../commons/logger.js";
import { MetricDimension, MetricName } from "../../commons/metric-enum.js";
import { calculateVot } from "../../domain/stored-identity/calculate-vot.js";
import { createStoredIdentityHash } from "../../domain/stored-identity/stored-identity-hashing.js";
import {
  StoredIdentityRecord,
  StoredIdentityVectorOfTrust,
} from "../../domain/stored-identity/stored-identity-types.js";
import {
  handleGetIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../domain/stored-identity/stored-identity-validator.js";
import { hasIdentityExpired } from "../../domain/verifiable-credential/identity-expiry-service.js";
import { ConfirmDetailsQueryStringParameters } from "./get-confirm-details-handler-types.js";
import mainPageTemplate from "./index.njk";
import { extractUserDetails } from "./user-details-content.js";

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

const metrics = new Metrics();

const tryUpdateSessionData = async (sessionId: string, data: Record<string, string>): Promise<void> => {
  try {
    await updateSessionData(sessionId, data);
  } catch (error) {
    logger.error(`Failed to update session data: ${error}`);
    throw error;
  }
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
      await tryUpdateSessionData(sessionId, { errorDescription: "record_update_requested" });

      return redirectToOauthCallBack({ redirectUri: redirect_uri, state, clientId: client_id });
    }

    const storedIdentityJwt = identityResponse.si.vc;
    const content = getJwtBody<StoredIdentityRecord>(storedIdentityJwt);
    const unsignedVot: IdentityVectorOfTrust = identityResponse.si.unsignedVot;
    const storedIdentityVcJwts: string[] = identityResponse.vcs.map((vcObject) => vcObject.vc);
    const vot = calculateVot(content, unsignedVot, vtr);

    const identityReuseValid = await validateUserIdentity(vot, storedIdentityVcJwts, vtr);
    if (!identityReuseValid) {
      await tryUpdateSessionData(sessionId, { errorDescription: "record_update_requested" });
      return redirectToOauthCallBack({ redirectUri: redirect_uri, state, clientId: client_id });
    }

    await sessionStoreHashedStoredIdentity(sessionId, storedIdentityJwt, vot, storedIdentityVcJwts);

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
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_update_requested" });
      return redirectToOauthCallBack({ redirectUri: redirect_uri, state, clientId: client_id });
    }
    if (error instanceof StoredIdentityValidationError) {
      logger.error("Stored identity record is missing required user details");
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_update_requested" });
      return redirectToOauthCallBack({ redirectUri: redirect_uri, state, clientId: client_id });
    }
    logger.error(`Error in lambdaHandler event: ${error}`);
    return redirectToErrorPage(domainName);
  }
};

const validateUserIdentity = async (
  vot: StoredIdentityVectorOfTrust,
  storedIdentityVcJwts: string[],
  vtr: IdentityVectorOfTrust[]
): Promise<boolean> => {
  const { expired, fraudExpired, drivingLicenceExpired } = await hasIdentityExpired(storedIdentityVcJwts);
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

const sessionStoreHashedStoredIdentity = async (
  sessionId: string,
  storedIdentityJwt: string,
  vot: StoredIdentityVectorOfTrust,
  vcJwts: string[]
) => {
  const hash = createStoredIdentityHash(storedIdentityJwt, vot, vcJwts);
  await updateSessionData(sessionId, { storedIdentitySha256: hash });
};
