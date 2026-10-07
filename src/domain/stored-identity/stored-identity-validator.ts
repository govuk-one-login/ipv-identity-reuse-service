import { getConfiguration } from "../../commons/configuration.js";
import * as didResolutionService from "../../api/did-resolution-api.js";
import { jwtVerify } from "jose";
import logger from "../../commons/logger.js";
import { EVCSIdentityResponse, getIdentityFromEVCS } from "../../api/evcs-api.js";
import { getJwtBody, getJwtHeader } from "../../commons/jwt-utilities.js";
import { HttpCodesEnum } from "../../commons/constants.js";
import { APIGatewayProxyResult } from "aws-lambda";
import { EVCSError, StoredIdentityValidationError, TokenValidationError } from "../../commons/errors.js";
import { UserIdentityErrorResponse } from "../../handlers/post-phase2-user-identity-handler/post-phase2-user-identity-types.js";
import { auditIdentityRecordRead, auditIdentityRecordReturned } from "../../commons/audit.js";
import {
  StoredIdentityRecord,
  isStoredIdentityRecord,
  StoredIdentityValidationResult,
  SignedStoredIdentity,
} from "./stored-identity-types.js";
import { correlateCredentials } from "./credential-correlator.js";
import { ErrorCodeEnum, ResponseBody } from "@govuk-one-login/event-catalogue/SIS_STORED_IDENTITY_RETURNED.js";

export const getIdentityFromCredentialStore = async (
  authorizationToken: string
): Promise<EVCSIdentityResponse | undefined> => {
  const result = await getIdentityFromEVCS(authorizationToken);
  if (result.ok) {
    return await result.json();
  } else if (result.status === HttpCodesEnum.NOT_FOUND) {
    logger.info("No stored identity found for user");
    return undefined;
  } else {
    logger.error("Error received from EVCS", { status: result.status });
    throw new EVCSError(result.status);
  }
};

export const validateStoredIdentity = async (
  identityResponse: EVCSIdentityResponse
): Promise<StoredIdentityValidationResult> => {
  const kid = getJwtHeader(identityResponse.si.vc).kid || "";
  const { kidValid, signatureValid } = await validateCryptography(kid, identityResponse);

  const storedIdentityRecord = getStoredIdentityRecordBody(identityResponse.si.vc);
  const currentVcsEncoded = identityResponse.vcs.map((vc) => vc.vc);
  const isValid = correlateCredentials(storedIdentityRecord, currentVcsEncoded);

  return { kidValid, signatureValid, isValid, storedIdentityRecord: storedIdentityRecord };
};

export const getSignedStoredIdentity = async (
  authorizationToken: string
): Promise<SignedStoredIdentity | undefined> => {
  const evcsIdentityResponseBody = await getIdentityFromCredentialStore(authorizationToken);
  return evcsIdentityResponseBody
    ? {
        signedStoredIdentityRecord: evcsIdentityResponseBody.si.vc,
        signedCredentials: evcsIdentityResponseBody.vcs.map((item) => item.vc),
      }
    : undefined;
};

export const getStoredIdentityRecordBody = (signedStoredIdentityRecord: string): StoredIdentityRecord => {
  let jwtBody;
  try {
    jwtBody = getJwtBody<StoredIdentityRecord>(signedStoredIdentityRecord);
  } catch (error) {
    logger.error("Cannot decode stored identity JWT", { cause: error });
    throw new StoredIdentityValidationError("Cannot decode stored identity JWT", { cause: error });
  }

  if (isStoredIdentityRecord(jwtBody)) {
    return jwtBody;
  } else {
    logger.error("JWT is not a valid stored identity record");
    throw new StoredIdentityValidationError("JWT is not a valid stored identity record");
  }
};

export const validateCryptography = async (
  kid: string,
  identityResponse: EVCSIdentityResponse
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

const verifySignature = async (kid: string, jwt: string): Promise<boolean> => {
  try {
    const jwk = await didResolutionService.getPublicKeyJwkForKid(kid);
    await jwtVerify(jwt, jwk);
  } catch (error) {
    logger.error("Error verifying signature", { error });
    return false;
  }
  return true;
};

export const getUserIdFromJwt = (authorizationToken: string): string => {
  let jwt;
  try {
    jwt = getJwtBody(authorizationToken.split(" ").at(1) || "");
  } catch {
    logger.error("Error whilst decoding Bearer token body");
    throw new TokenValidationError(HttpCodesEnum.UNAUTHORIZED);
  }
  if (!jwt.sub) {
    logger.error("Bearer token does not include subject");
    throw new TokenValidationError(HttpCodesEnum.UNAUTHORIZED);
  }
  return jwt.sub;
};

export const createErrorResponse = (errorCode: HttpCodesEnum): APIGatewayProxyResult => {
  let error;
  let error_description;
  switch (errorCode) {
    case HttpCodesEnum.BAD_REQUEST: {
      error = "bad_request";
      error_description = "Bad request from client";
      break;
    }
    case HttpCodesEnum.NOT_FOUND: {
      error = "not_found";
      error_description = "No Stored Identity exists for this user or Stored Identity has been invalidated";
      break;
    }
    case HttpCodesEnum.UNAUTHORIZED: {
      error = "invalid_token";
      error_description = "Bearer token is missing or invalid";
      break;
    }
    case HttpCodesEnum.FORBIDDEN: {
      error = "forbidden";
      error_description = "Access token expired or not permitted";
      break;
    }
    default: {
      error = "server_error";
      error_description = "Unable to retrieve data";
    }
  }
  return {
    statusCode: errorCode,
    body: JSON.stringify({ error, error_description } as UserIdentityErrorResponse),
  };
};

export const createAndLogErrorResponse = async (
  errorCode: HttpCodesEnum,
  userId: string,
  govukSigninJourneyId?: string
): Promise<APIGatewayProxyResult> => {
  await auditIdentityRecordRead(
    {
      retrieval_outcome: errorCode === HttpCodesEnum.NOT_FOUND ? "no_record" : "service_error",
    },
    {
      stored_identity_jwt: undefined,
    },
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
      response_body: errorResponse.body as ResponseBody,
    },
    userId,
    govukSigninJourneyId
  );

  return errorResponse;
};

const generateErrorCodeDescription = async (errorCode: HttpCodesEnum): Promise<ErrorCodeEnum> => {
  let error_code_description: ErrorCodeEnum;
  switch (errorCode) {
    case HttpCodesEnum.NOT_FOUND: {
      error_code_description = "no_record";
      break;
    }
    case HttpCodesEnum.UNAUTHORIZED: {
      error_code_description = "authentication_failure";
      break;
    }
    case HttpCodesEnum.FORBIDDEN: {
      error_code_description = "forbidden";
      break;
    }
    default: {
      error_code_description = "service_error";
    }
  }
  return error_code_description;
};
