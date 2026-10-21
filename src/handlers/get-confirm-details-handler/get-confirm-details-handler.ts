import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import path from "node:path";
import nunjucks from "nunjucks";
import translations from "../../../locales/en/translation.json" with { type: "json" };
import { redirectToErrorPage, redirectToOauthCallBack, redirectToSessionExpiredPage } from "../../api/sis-api.js";
import { SessionInvalidError, StoredIdentityValidationError } from "../../utilities/errors.js";
import { getSessionDetails, updateSessionData } from "../../api/oauth-internal-api.js";
import logger from "../../utilities/logger.js";
import { createStoredIdentityHash } from "../../domain/stored-identity/stored-identity-hashing.js";
import { getConfiguration } from "../../configuration/configuration.js";
import type {
  CalculatedVectorOfTrust,
  StoredIdentityValidationResult,
} from "../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../domain/stored-identity/stored-identity-validator.js";
import mainPageTemplate from "./index.njk";
import { extractUserDetails } from "./user-details-content.js";
import { getCookieValues } from "../../utilities/cookie-utilities.js";
import { getReuseDecision, ReuseDecision } from "../../domain/reuse/reuse-decision.js";

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
        await tryUpdateSessionData(sessionId, { errorDescription: "record_unavailable" });

        return redirectToOauthCallBack();
      }

      const storedIdentityJwt = identityResponse.si.vc;
      const storedIdentityVcJwts: string[] = identityResponse.vcs.map((vcObject) => vcObject.vc);

      const reuseDecision: ReuseDecision = getReuseDecision(
        storedIdentityJwt,
        storedIdentityVcJwts,
        identityResponse.si.unsignedVot,
        vtr,
        await getConfiguration()
      );

      if (!reuseDecision.isReusable) {
        await tryUpdateSessionData(sessionId, { errorDescription: "record_unavailable" });
        return redirectToOauthCallBack();
      }

      await sessionStoreHashedStoredIdentity(
        sessionId,
        storedIdentityJwt,
        reuseDecision.rawData.vot,
        storedIdentityVcJwts
      );

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
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_unavailable" });
      return redirectToOauthCallBack();
    }
  } catch (error) {
    if (error instanceof SessionInvalidError) {
      return redirectToSessionExpiredPage(domainName);
    } else if (error instanceof StoredIdentityValidationError) {
      logger.error("Stored identity record is missing required user details");
      await tryUpdateSessionData(sessionId!, { errorDescription: "record_unavailable" });

      return redirectToOauthCallBack();
    } else {
      logger.error(`Error in lambdaHandler event: ${error}`);
    }
    return redirectToErrorPage(domainName);
  }
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
