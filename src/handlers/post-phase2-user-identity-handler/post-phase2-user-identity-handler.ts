import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { auditIdentityRecordRead, auditIdentityRecordReturned } from "../../utilities/audit.js";
import { HttpCodesEnum } from "../../utilities/constants.js";
import { getJwtBody } from "../../utilities/jwt-utilities.js";
import logger from "../../utilities/logger.js";
import { EVCSIdentityResponse } from "../../api/evcs-api.js";
import { calculateVot } from "../../domain/stored-identity/calculate-vot.js";
import { hasIdentityExpired } from "../../domain/verifiable-credential/identity-expiry-service.js";
import { UserIdentityRequest, UserIdentityResponse } from "./post-phase2-user-identity-types.js";
import { StoredIdentityRecord, CalculatedVectorOfTrust } from "../../domain/stored-identity/stored-identity-types.js";
import { getProperty } from "../../utilities/case-insensitive-header-utilities.js";
import {
  getUserIdFromJwt,
  getIdentityFromCredentialStore,
  createErrorResponse,
  createAndLogErrorResponse,
  validateStoredIdentity,
} from "../../domain/stored-identity/stored-identity-validator.js";
import { EVCSError } from "../../utilities/errors.js";
import { VotEnum } from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_READ.js";
import { ResponseBody } from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_RETURNED.js";
import { getConfiguration } from "../../configuration/configuration.js";

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const request = event.body ? (JSON.parse(event.body) as UserIdentityRequest) : undefined;

  logger.addContext(context);

  if (!request) {
    logger.error("Request body is invalid");
    return createErrorResponse(HttpCodesEnum.BAD_REQUEST);
  }

  logger.appendKeys({
    govuk_signin_journey_id: request.govukSigninJourneyId,
  });

  const authorisation = getProperty(event?.headers, "authorization");

  if (!authorisation) {
    logger.error("Authorisation header was not included in request");
    return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
  }

  let subject: string;
  try {
    subject = getUserIdFromJwt(authorisation);
  } catch {
    logger.error("Error whilst decoding Bearer token body");
    return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
  }

  try {
    const identityResponse = await getIdentityFromCredentialStore(authorisation);

    if (identityResponse) {
      const response = await createSuccessResponse(
        identityResponse,
        request.vtr,
        subject,
        request.govukSigninJourneyId
      );
      return { statusCode: HttpCodesEnum.OK, body: JSON.stringify(response) };
    } else {
      return await createAndLogErrorResponse(HttpCodesEnum.NOT_FOUND, subject, request.govukSigninJourneyId);
    }
  } catch (error) {
    if (error instanceof EVCSError) {
      return await createAndLogErrorResponse(error.statusCode, subject, request.govukSigninJourneyId);
    }
    logger.error("Error retrieving user identity", { error });
    return await createAndLogErrorResponse(HttpCodesEnum.INTERNAL_SERVER_ERROR, subject, request.govukSigninJourneyId);
  }
};

const createSuccessResponse = async (
  identityResponse: EVCSIdentityResponse,
  vtr: IdentityVectorOfTrust[],
  userId: string,
  govukSigninJourneyId: string
): Promise<UserIdentityResponse> => {
  const content = getJwtBody<StoredIdentityRecord>(identityResponse.si.vc);
  const { kidValid, signatureValid, isValid } = await validateStoredIdentity(identityResponse);
  const vot: CalculatedVectorOfTrust = calculateVot(content, identityResponse.si.unsignedVot, vtr);
  const configuration = await getConfiguration();
  const maxVot = (content.max_vot || identityResponse.si.unsignedVot) as VotEnum;
  const { expired, fraudVc } = hasIdentityExpired(
    identityResponse.vcs.map((vcObject) => vcObject.vc),
    configuration
  );

  await auditIdentityRecordRead(
    {
      retrieval_outcome: "success",
      max_vot: maxVot,
      ...(fraudVc ? { timestamp_fraud_check_nbf: fraudVc?.nbf } : {}),
    },
    {
      stored_identity_jwt: identityResponse.si.vc,
    },
    userId,
    govukSigninJourneyId
  );

  delete content.max_vot;

  const successResponse: UserIdentityResponse = {
    content: { ...content, vot, vtm: configuration.vtm },
    vot: maxVot,
    isValid: isValid,
    expired,
    kidValid,
    signatureValid,
  };

  await auditIdentityRecordReturned(
    {
      response_outcome: "returned",
      is_valid: successResponse.isValid,
      expired: successResponse.expired,
      vot: successResponse.content.vot as VotEnum,
    },
    {
      response_body: JSON.stringify(successResponse) as ResponseBody,
    },
    userId,
    govukSigninJourneyId
  );

  return successResponse;
};
