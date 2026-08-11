import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { jwtVerify } from "jose";
import { auditIdentityRecordRead, auditIdentityRecordReturned } from "../../commons/audit";
import { getConfiguration } from "../../commons/configuration";
import { HttpCodesEnum } from "../../commons/constants";
import { getJwtBody, getJwtHeader } from "../../commons/jwt-utilities";
import logger from "../../commons/logger";
import { CredentialStoreIdentityResponse } from "../../credential-store/credential-store-identity-response";
import {
  getIdentityFromCredentialStore,
  parseCurrentVerifiableCredentials,
} from "../../credential-store/encrypted-credential-store";
import { calculateVot } from "../../identity-reuse/calculate-vot";
import { getFraudVc } from "../../identity-reuse/fraud-check-service";
import { hasIdentityExpired } from "../../identity-reuse/identity-expiry-service";
import { validateStoredIdentityCredentials } from "../../identity-reuse/stored-identity-validator";
import { VerifiableCredentialJWT } from "../../identity-reuse/verifiable-credential-jwt";
import { UserIdentityErrorResponse } from "./post-phase2-user-identity-error-response";
import { UserIdentityRequest } from "./post-phase2-user-identity-request";
import { StoredIdentityJWT } from "./stored-identity-jwt";
import { StoredIdentityVectorOfTrust, UserIdentityResponse } from "./post-phase2-user-identity-response";
import { getProperty } from "../../commons/case-insensitive-header-utilities";
import {
  getUserIdFromJwt,
  handleGetIdentityFromCredentialStore,
  createErrorResponse,
  createAndLogErrorResponse,
  validateCryptography,
  validateIdentityRecords,
} from "../../commons/validate-records";
import { CredentialStoreError } from "../../commons/errors";

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
    const identityResponse = await handleGetIdentityFromCredentialStore(
      authorisation,
      subject,
      request.govukSigninJourneyId
    );
    const response = await createSuccessResponse(identityResponse, request.vtr, subject, request.govukSigninJourneyId);

    return { statusCode: HttpCodesEnum.OK, body: JSON.stringify(response) };
  } catch (error) {
    if (error instanceof CredentialStoreError) {
      return await createAndLogErrorResponse(error.statusCode, error.userId, error.journeyId);
    }
    logger.error("Error retrieving user identity", { error });
    return await createAndLogErrorResponse(HttpCodesEnum.INTERNAL_SERVER_ERROR, subject, request.govukSigninJourneyId);
  }
};

const createSuccessResponse = async (
  identityResponse: CredentialStoreIdentityResponse,
  vtr: IdentityVectorOfTrust[],
  userId: string,
  govukSigninJourneyId: string
): Promise<UserIdentityResponse> => {
  const configuration = await getConfiguration();
  const currentVcsEncoded: string[] = identityResponse.vcs.map((vcWithMetadata) => vcWithMetadata.vc);
  const currentVcs: VerifiableCredentialJWT[] = parseCurrentVerifiableCredentials(identityResponse);
  const fraudVc = getFraudVc(currentVcs, configuration.fraudIssuer);
  const content = getJwtBody<StoredIdentityJWT>(identityResponse.si.vc);
  const { kidValid, signatureValid, isValid } = await validateIdentityRecords(identityResponse);
  const kid = getJwtHeader(identityResponse.si.vc).kid || "";
  const validationResults = await validateCryptography(kid, identityResponse);
  const vot: StoredIdentityVectorOfTrust = calculateVot(content, identityResponse.si.unsignedVot, vtr);
  const vtm = `https://oidc.account.gov.uk/trustmark`;
  const maxVot = content.max_vot || identityResponse.si.unsignedVot;

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

  const expired = hasIdentityExpired(currentVcs, configuration);

  const successResponse: UserIdentityResponse = {
    content: { ...content, vot, vtm },
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
      vot: successResponse.content.vot,
    },
    {
      response_body: JSON.stringify(successResponse),
    },
    userId,
    govukSigninJourneyId
  );

  return successResponse;
};
