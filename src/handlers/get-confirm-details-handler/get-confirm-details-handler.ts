import { Metrics } from "@aws-lambda-powertools/metrics";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import path from "node:path";
import nunjucks from "nunjucks";
import translations from "../../../locales/en/translation.json" with { type: "json" };
import { redirectToErrorPage, redirectToOauthCallBack, redirectToSessionExpiredPage } from "../../api/sis-api.js";
import { SessionInvalidError, StoredIdentityValidationError } from "../../utilities/errors.js";
import { getSessionDetails, updateSessionData } from "../../api/oauth-internal-api.js";
import { getJwtBody } from "../../utilities/jwt-utilities.js";
import logger from "../../utilities/logger.js";
import { MetricDimension, MetricName } from "../../utilities/metric-enum.js";
import { calculateVot } from "../../domain/stored-identity/calculate-vot.js";
import { createStoredIdentityHash } from "../../domain/stored-identity/stored-identity-hashing.js";
import type {
  StoredIdentityRecord,
  CalculatedVectorOfTrust,
  StoredIdentityValidationResult,
} from "../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../domain/stored-identity/stored-identity-validator.js";
import { hasIdentityExpired } from "../../domain/verifiable-credential/identity-expiry-service.js";
import mainPageTemplate from "./index.njk";
import { extractUserDetails } from "./user-details-content.js";
import { getCookieValues } from "../../utilities/cookie-utilities.js";

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

const isStoredIdentityValidated = ({
  kidValid,
  signatureValid,
  isValid,
  storedIdentityRecord,
}: StoredIdentityValidationResult) => {
  return !kidValid || !signatureValid || !isValid || !storedIdentityRecord;
};

export const lambdaHandler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const domainName = process.env.DOMAIN_NAME || "";
  const sessionId = getCookieValues(event)?.get("identity_reuse_service_session");

  logger.addContext(context);

  try {
    if (!sessionId) {
      logger.error("Session cookie not found");
      return redirectToSessionExpiredPage(domainName);
    }

    const { storageAccessToken, vtr } = await getSessionDetails(sessionId);

    if (!storageAccessToken) {
      logger.error("No storageAccessToken returned from session endpoint");
      return redirectToErrorPage(domainName);
    }

    if (!vtr) {
      logger.error("No vtr value returned from session endpoint");
      return redirectToErrorPage(domainName);
    }

    const identityResponse = await getIdentityFromCredentialStore(`Bearer ${storageAccessToken}`);
    if (identityResponse) {
      const validationResult = await validateStoredIdentity(identityResponse);
      if (isStoredIdentityValidated(validationResult)) {
        logger.error("Record validation failed for existing user", {
          kidValid: validationResult.kidValid,
          signatureValid: validationResult.signatureValid,
          isValid: validationResult.isValid,
        });
        await tryUpdateSessionData(sessionId, { errorDescription: "record_update_requested" });

        return redirectToOauthCallBack();
      }

      const storedIdentityJwt = identityResponse.si.vc;
      const content = getJwtBody<StoredIdentityRecord>(storedIdentityJwt);
      const unsignedVot: IdentityVectorOfTrust = identityResponse.si.unsignedVot;
      const storedIdentityVcJwts: string[] = identityResponse.vcs.map((vcObject) => vcObject.vc);
      const vot = calculateVot(content, unsignedVot, vtr);

      const identityReuseValid = await validateUserIdentity(vot, storedIdentityVcJwts, vtr);
      if (!identityReuseValid) {
        await tryUpdateSessionData(sessionId, { errorDescription: "record_update_requested" });
        return redirectToOauthCallBack();
      }

      await sessionStoreHashedStoredIdentity(sessionId, storedIdentityJwt, vot, storedIdentityVcJwts);

      const userDetails = extractUserDetails(validationResult.storedIdentityRecord);

      return {
        statusCode: 200,
        body: nunjucksEnvironment.render(mainPageTemplate, {
          assetPath: "./assets",
          rootPath: ".",
          userDetails,
          translations,
          govukRebrand: true,
        }),
        headers: {
          "content-type": "text/html",
        },
      };
    } else {
      logger.error("No identity record found in EVCS");
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_update_requested" });
      return redirectToOauthCallBack();
    }
  } catch (error) {
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPage(domainName);
    } else if (error instanceof StoredIdentityValidationError) {
      logger.error("Stored identity record is missing required user details");
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_update_requested" });

      return redirectToOauthCallBack();
    } else {
      logger.error(`Error in lambdaHandler event: ${error}`);
    }
    return redirectToErrorPage(domainName);
  }
};

const validateUserIdentity = async (
  vot: CalculatedVectorOfTrust,
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
  vot: CalculatedVectorOfTrust,
  vcJwts: string[]
) => {
  const hash = createStoredIdentityHash(storedIdentityJwt, vot, vcJwts);
  await updateSessionData(sessionId, { vot: vot, storedIdentitySha256: hash });
};
