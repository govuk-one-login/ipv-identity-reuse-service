import { Metrics } from "@aws-lambda-powertools/metrics";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import translations from "../../../../locales/en/translation.json" with { type: "json" };
import {
  redirectToErrorPageExpress,
  redirectToOauthCallBackExpress,
  redirectToSessionExpiredPageExpress,
} from "../../../api/sis-api.js";
import { SessionInvalidError, StoredIdentityValidationError } from "../../../utilities/errors.js";
import { getSessionDetails, updateSessionData } from "../../../api/oauth-internal-api.js";
import { getJwtBody } from "../../../utilities/jwt-utilities.js";
import logger from "../../../utilities/logger.js";
import { MetricDimension, MetricName } from "../../../utilities/metric-enum.js";
import { calculateVot } from "../../../domain/stored-identity/calculate-vot.js";
import { createStoredIdentityHash } from "../../../domain/stored-identity/stored-identity-hashing.js";
import { getConfiguration, type Configuration } from "../../../configuration/configuration.js";
import type {
  StoredIdentityRecord,
  CalculatedVectorOfTrust,
  StoredIdentityValidationResult,
} from "../../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../../domain/stored-identity/stored-identity-validator.js";
import { hasIdentityExpired } from "../../../domain/verifiable-credential/identity-expiry-service.js";
import mainPageTemplate from "./index.njk";
import { extractUserDetails } from "./user-details-content.js";
import { RequestHandler } from "express";

const metrics = new Metrics();

export const handler: RequestHandler = async (request, response) => {
  const sessionId = request.cookies?.["identity_reuse_service_session"];

  try {
    if (!sessionId) {
      logger.error("Session cookie not found");
      return redirectToSessionExpiredPageExpress(response);
    }

    const { storageAccessToken, vtr } = await getSessionDetails(sessionId);
    if (!storageAccessToken) {
      logger.error("No storageAccessToken returned from session endpoint");
      return redirectToErrorPageExpress(response);
    }

    if (!vtr) {
      logger.error("No vtr value returned from session endpoint");
      return redirectToErrorPageExpress(response);
    }

    const identityResponse = await getIdentityFromCredentialStore(`Bearer ${storageAccessToken}`);
    if (!identityResponse) {
      logger.error("No identity record found in EVCS");
      await updateSessionData(sessionId!, { errorDescription: "record_unavailable" });
      return redirectToOauthCallBackExpress(response);
    }

    const validationResult = await validateStoredIdentity(identityResponse);
    if (!isStoredIdentityValid(validationResult)) {
      logger.error("Record validation failed for existing user", {
        kidValid: validationResult.kidValid,
        signatureValid: validationResult.signatureValid,
        isValid: validationResult.isValid,
      });
      await updateSessionData(sessionId, { errorDescription: "record_unavailable" });

      return redirectToOauthCallBackExpress(response);
    }

    const configuration = await getConfiguration();
    const storedIdentityJwt = identityResponse.si.vc;
    const content = getJwtBody<StoredIdentityRecord>(storedIdentityJwt);
    const unsignedVot: IdentityVectorOfTrust = identityResponse.si.unsignedVot;
    const storedIdentityVcJwts: string[] = identityResponse.vcs.map((vcObject) => vcObject.vc);
    const vot = calculateVot(content, unsignedVot, vtr);

    const identityReuseValid = validateUserIdentity(vot, storedIdentityVcJwts, vtr, configuration);
    if (!identityReuseValid) {
      await updateSessionData(sessionId, { errorDescription: "record_unavailable" });
      return redirectToOauthCallBackExpress(response);
    }

    await sessionStoreHashedStoredIdentity(sessionId, storedIdentityJwt, vot, storedIdentityVcJwts);

    const userDetails = extractUserDetails(validationResult.storedIdentityRecord);

    return response.header("content-type", "text/html").render(mainPageTemplate, {
      assetPath: "./assets",
      rootPath: ".",
      userDetails,
      translations,
      govukRebrand: true,
    });
  } catch (error) {
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPageExpress(response);
    } else if (error instanceof StoredIdentityValidationError) {
      logger.error("Stored identity record is missing required user details");
      await updateSessionData(sessionId!, { errorDescription: "record_unavailable" });

      return redirectToOauthCallBackExpress(response);
    } else {
      logger.error(`Error in lambdaHandler event: ${error}`);
    }
    return redirectToErrorPageExpress(response);
  }
};

const validateUserIdentity = (
  vot: CalculatedVectorOfTrust,
  storedIdentityVcJwts: string[],
  vtr: IdentityVectorOfTrust[],
  configuration: Configuration
): boolean => {
  const { expired, fraudExpired, drivingLicenceExpired } = hasIdentityExpired(storedIdentityVcJwts, configuration);
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
  vot: CalculatedVectorOfTrust,
  vcJwts: string[]
) => {
  const hash = createStoredIdentityHash(storedIdentityJwt, vot, vcJwts);
  await updateSessionData(sessionId, { vot: vot, storedIdentitySha256: hash });
};

const isStoredIdentityValid = ({
  kidValid,
  signatureValid,
  isValid,
  storedIdentityRecord,
}: StoredIdentityValidationResult) => kidValid && signatureValid && isValid && storedIdentityRecord;
