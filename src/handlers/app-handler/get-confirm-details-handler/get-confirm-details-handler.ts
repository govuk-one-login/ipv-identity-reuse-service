import translations from "../../../../locales/en/translation.json" with { type: "json" };
import {
  redirectToErrorPageExpress,
  redirectToOauthCallBackExpress,
  redirectToSessionExpiredPageExpress,
} from "../../../api/sis-api.js";
import { SessionInvalidError, StoredIdentityValidationError } from "../../../utilities/errors.js";
import { getSessionDetails, updateSessionData } from "../../../api/oauth-internal-api.js";
import logger from "../../../utilities/logger.js";
import { createStoredIdentityHash } from "../../../domain/stored-identity/stored-identity-hashing.js";
import { getConfiguration } from "../../../configuration/configuration.js";
import type {
  CalculatedVectorOfTrust,
  StoredIdentityValidationResult,
} from "../../../domain/stored-identity/stored-identity-types.js";
import {
  getIdentityFromCredentialStore,
  validateStoredIdentity,
} from "../../../domain/stored-identity/stored-identity-validator.js";
import mainPageTemplate from "./index.njk";
import { extractUserDetails } from "./user-details-content.js";
import { RequestHandler } from "express";
import { getReuseDecision, ReuseDecision } from "../../../domain/reuse/reuse-decision.js";

const isStoredIdentityValid = ({
  kidValid,
  signatureValid,
  isValid,
  storedIdentityRecord,
}: StoredIdentityValidationResult) => kidValid && signatureValid && isValid && storedIdentityRecord;

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
      logger.error("Record validation failed for existing user");
      await updateSessionData(sessionId, { errorDescription: "record_unavailable" });
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
      await updateSessionData(sessionId, { errorDescription: "record_unavailable" });
      return redirectToOauthCallBackExpress(response);
    }

    await sessionStoreHashedStoredIdentity(
      sessionId,
      storedIdentityJwt,
      reuseDecision.rawData.vot,
      storedIdentityVcJwts
    );

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

const sessionStoreHashedStoredIdentity = async (
  sessionId: string,
  storedIdentityJwt: string,
  vot: CalculatedVectorOfTrust,
  vcJwts: string[]
) => {
  const hash = createStoredIdentityHash(storedIdentityJwt, vot, vcJwts);
  await updateSessionData(sessionId, { vot: vot, storedIdentitySha256: hash });
};
