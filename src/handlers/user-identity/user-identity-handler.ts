import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { jwtVerify } from "jose";
import { auditIdentityRecordRead, auditIdentityRecordReturned } from "../../services/audit";
import { getConfiguration } from "../../services/configuration";
import { HttpCodesEnum } from "../../commons/constants";
import { getJwtBody, getJwtHeader } from "../../commons/jwt-utils";
import logger from "../../commons/logger";
import {
  CredentialStoreIdentityResponse,
  getIdentityFromCredentialStore,
  parseCurrentVerifiableCredentials,
} from "../../services/encrypted-credential-store";
import { calculateVot } from "./identity-reuse/calculate-vot";
import * as didResolutionService from "./identity-reuse/did-resolution-service";
import { getFraudVc, hasFraudCheckExpired } from "./identity-reuse/fraud-check-service";
import { validateStoredIdentityCredentials } from "./identity-reuse/stored-identity-validator";
import { VerifiableCredentialJWT } from "../../commons/verifiable-credential-jwt";
import { StoredIdentityJWT } from "../../commons/stored-identity-jwt";

export type UserIdentityRequest = {
  vtr: IdentityVectorOfTrust[];
  govukSigninJourneyId: string;
};

export type StoredIdentityVectorOfTrust = IdentityVectorOfTrust | "P0";

export type UserIdentityResponse = {
  content: StoredIdentityJWT<StoredIdentityVectorOfTrust>;
  isValid: boolean;
  expired: boolean;
  vot: IdentityVectorOfTrust;
  kidValid: boolean;
  signatureValid: boolean;
};

export type UserIdentityErrorResponse = {
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
    const result: Response = await getIdentityFromCredentialStore(authorisation);

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

const getProperty = <T extends Record<string, unknown>>(obj: T, property: string): string | undefined => {
  const propertyLowerCase = property.toLowerCase();
  const foundKey = Object.keys(obj).find((k) => k.toLowerCase() === propertyLowerCase);
  return foundKey && typeof obj[foundKey] === "string" ? obj[foundKey] : undefined;
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
  const kid = getJwtHeader(identityResponse.si.vc).kid || "";
  const validationResults = await validateCryptography(kid, identityResponse);
  const vot: StoredIdentityVectorOfTrust = calculateVot(content, identityResponse.si.unsignedVot, vtr);
  const vtm = `https://oidc.account.gov.uk/trustmark`;
  const maxVot = content.max_vot || identityResponse.si.unsignedVot;

  await auditIdentityRecordRead(
    {
      retrieval_outcome: "success",
      max_vot: maxVot,
      ...(fraudVc ? { timestamp_fraud_check_iat: fraudVc?.iat } : {}),
    },
    {
      stored_identity_jwt: identityResponse.si.vc,
    },
    userId,
    govukSigninJourneyId
  );

  delete content.max_vot;

  const successResponse: UserIdentityResponse = {
    content: { ...content, vot, vtm },
    vot: maxVot,
    isValid: validateStoredIdentityCredentials(content, currentVcsEncoded),
    expired: hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod),
    ...validationResults,
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
    body: JSON.stringify({ error, error_description } as UserIdentityErrorResponse),
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
