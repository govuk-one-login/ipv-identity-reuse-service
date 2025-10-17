import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { auditIdentityRecordRead, auditIdentityRecordReturned } from "../../commons/audit";
import { getConfiguration } from "../../commons/configuration";
import { HttpCodesEnum } from "../../commons/constants";
import { getJwtBody, getJwtHeader } from "../../commons/jwt-utils";
import logger from "../../commons/logger";
import { CredentialStoreIdentityResponse } from "../../credential-store/credential-store-identity-response";
import {
  getIdentityFromCredentialStore,
  parseCurrentVerifiableCredentials,
} from "../../credential-store/encrypted-credential-store";
import { VerifiableCredentialJWT } from "../../identity-reuse/verifiable-credential-jwt";
import { UserIdentityRequest } from "./user-identity-request";
import * as didResolutionService from "../../identity-reuse/did-resolution-service";
import { UserIdentityResponse as CredentialStoreStoredIdentityJWT } from "./user-identity-response";
import { UserIdentityResponseMetadata } from "./user-identity-response-metadata";
import { calculateVot } from "../../identity-reuse/calculate-vot";
import { getFraudVc, hasFraudCheckExpired } from "../../identity-reuse/fraud-check-service";
import { validateStoredIdentityCredentials } from "../../identity-reuse/stored-identity-validator";
import { jwtVerify } from "jose";

type ErrorResponse = {
  error: string;
  error_description: string;
};

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const request = event.body ? (JSON.parse(event.body) as UserIdentityRequest) : undefined;

  logger.addContext(context);

  if (!request) {
    logger.error("Request body is invalid");
    return createErrorResponse(HttpCodesEnum.BAD_REQUEST);
  }

  const authorisation = getProperty(event?.headers, "authorization");

  if (!authorisation) {
    logger.error("Authorisation header was not included in request");
    return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
  }

  let subject: string;
  try {
    const jwt = getJwtBody(authorisation.split(" ").at(1) || ""); // Validate bearer token
    if (!jwt.sub) {
      logger.error("Bearer token does not include subject");
      return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
    }

    subject = jwt.sub;
  } catch {
    logger.error("Error whilst decoding Bearer token body");
    return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
  }

  try {
    const result = await getIdentityFromCredentialStore(authorisation);

    if (!result.ok) {
      logger.error("Error received from EVCS service", { status: result.status });
      return await createAndLogErrorResponse(result.status, subject, request.govukSigninJourneyId);
    }

    const identityResponse: CredentialStoreIdentityResponse = await result.json();
    const response = await createSuccessResponse(identityResponse, request.vtr, subject, request.govukSigninJourneyId);

    return { statusCode: HttpCodesEnum.OK, body: JSON.stringify(response) };
  } catch (error) {
    logger.error("Error retrieving user identity", { error });
    return await createAndLogErrorResponse(HttpCodesEnum.INTERNAL_SERVER_ERROR, subject, request.govukSigninJourneyId);
  }
};

const getProperty = <T extends Record<string, any>>(obj: T, property: string) => {
  const propertyLowerCase = property.toLowerCase();
  const foundKey = Object.keys(obj).find((k) => k.toLowerCase() === propertyLowerCase);
  return foundKey ? obj[foundKey] : undefined;
};

const createSuccessResponse = async (
  identityResponse: CredentialStoreIdentityResponse,
  vtr: IdentityVectorOfTrust[],
  userId: string,
  govukSigninJourneyId: string
): Promise<UserIdentityResponseMetadata> => {
  const configuration = await getConfiguration();
  const content: CredentialStoreStoredIdentityJWT = getJwtBody(identityResponse.si.vc);
  const currentVcsEncoded: string[] = identityResponse.vcs.map((vcWithMetadata) => vcWithMetadata.vc);
  const currentVcs: VerifiableCredentialJWT[] = parseCurrentVerifiableCredentials(identityResponse);
  const fraudVc = getFraudVc(currentVcs, configuration.fraudIssuer);
  const kid = getJwtHeader(identityResponse.si.vc).kid || "";
  const validationResults = await validateCryptography(kid, identityResponse);
  const vot = calculateVot(content.vot as IdentityVectorOfTrust, vtr);

  await auditIdentityRecordRead(
    {
      retrieval_outcome: "success",
      max_vot: content.vot,
      ...(fraudVc ? { timestamp_fraud_check_iat: fraudVc?.iat } : {}),
    },
    {
      stored_identity_jwt: identityResponse.si.vc,
    },
    userId,
    govukSigninJourneyId
  );

  const successResponse = {
    content: { ...content, vot },
    vot: content.vot,
    isValid: validateStoredIdentityCredentials(content, currentVcsEncoded),
    expired: hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod),
    ...validationResults,
  };

  await auditIdentityRecordReturned(
    {
      response_outcome: "returned",
      is_valid: successResponse.isValid,
      expired: successResponse.expired,
      vot: successResponse.vot,
    },
    {
      response_body: JSON.stringify(successResponse),
    },
    userId,
    govukSigninJourneyId
  );

  return successResponse;
};

const createErrorResponse = (errorCode: HttpCodesEnum): APIGatewayProxyResult => {
  let error;
  let error_description;
  switch (errorCode) {
    case HttpCodesEnum.BAD_REQUEST:
      error = "bad_request";
      error_description = "Bad request from client";
      break;
    case HttpCodesEnum.NOT_FOUND:
      error = "not_found";
      error_description = "No Stored Identity exists for this user or Stored Identity has been invalidated";
      break;
    case HttpCodesEnum.UNAUTHORIZED:
      error = "invalid_token";
      error_description = "Bearer token is missing or invalid";
      break;
    case HttpCodesEnum.FORBIDDEN:
      error = "forbidden";
      error_description = "Access token expired or not permitted";
      break;
    default:
      error = "server_error";
      error_description = "Unable to retrieve data";
  }
  return {
    statusCode: errorCode,
    body: JSON.stringify({ error, error_description } as ErrorResponse),
  };
};

const generateErrorCodeDescription = async (errorCode: HttpCodesEnum): Promise<string> => {
  let error_code_description;
  switch (errorCode) {
    case HttpCodesEnum.NOT_FOUND:
      error_code_description = "no_record";
      break;
    case HttpCodesEnum.UNAUTHORIZED:
      error_code_description = "authentication_failure";
      break;
    case HttpCodesEnum.FORBIDDEN:
      error_code_description = "forbidden";
      break;
    default:
      error_code_description = "service_error";
  }
  return error_code_description;
};

const createAndLogErrorResponse = async (
  errorCode: HttpCodesEnum,
  userId: string,
  govukSigninJourneyId?: string
): Promise<APIGatewayProxyResult> => {
  await auditIdentityRecordRead(
    {
      retrieval_outcome: errorCode === HttpCodesEnum.NOT_FOUND ? "no_record" : "service_error",
    },
    undefined,
    userId,
    govukSigninJourneyId
  );

  const identityRecordErrorDescription = await generateErrorCodeDescription(errorCode);

  const errorResponse = createErrorResponse(errorCode);

  await auditIdentityRecordReturned(
    {
      response_outcome: "error",
      error_code: identityRecordErrorDescription,
    },
    {
      response_body: errorResponse.body,
    },
    userId,
    govukSigninJourneyId
  );

  return errorResponse;
};

const validateCryptography = async (
  kid: string,
  identityResponse: CredentialStoreIdentityResponse
): Promise<{ kidValid: boolean; signatureValid: boolean }> => {
  const configuration = await getConfiguration();
  const controller = didResolutionService.getDidWebController(kid);
  const kidValid = didResolutionService.isValidDidWeb(kid) && configuration.controllerAllowList.includes(controller);
  let signatureValid = false;
  if (kidValid) {
    signatureValid = await verifySignature(kid, identityResponse.si.vc);
  }
  return { kidValid, signatureValid };
};

export const verifySignature = async (kid: string, jwt: string): Promise<boolean> => {
  try {
    const jwk = await didResolutionService.getPublicKeyJwkForKid(kid);
    await jwtVerify(jwt, jwk);
  } catch (error) {
    logger.error("Error verifying signature", { error });
    return false;
  }
  return true;
};
