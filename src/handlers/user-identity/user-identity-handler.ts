import logger from "../../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { HttpCodesEnum } from "../../commons/constants";
import {
  getIdentityFromCredentialStore,
  parseCurrentVerifiableCredentials,
} from "../../credential-store/encrypted-credential-store";
import { CredentialStoreIdentityResponse } from "../../credential-store/credential-store-identity-response";
import { UserIdentityResponse as CredentialStoreStoredIdentityJWT } from "./user-identity-response";
import { UserIdentityResponseMetadata } from "./user-identity-response-metadata";
import { calculateVot } from "../../identity-reuse/calculate-vot";
import { UserIdentityRequest } from "./user-identity-request";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { getJwtBody } from "../../commons/jwt-utils";
import { VerifiableCredentialJWT } from "../../identity-reuse/verifiable-credential-jwt";
import { hasFraudCheckExpired } from "../../identity-reuse/fraud-check-service";

interface ErrorResponse {
  error: string;
  error_description: string;
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  const request = event.body ? (JSON.parse(event.body) as UserIdentityRequest) : undefined;

  logger.addContext(context);

  if (!request) {
    logger.error("Request body is invalid");
    return createErrorResponse(HttpCodesEnum.BAD_REQUEST);
  }

  if (!event?.headers?.Authorization) {
    logger.error("Authorisation header was not included in request");
    return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
  }

  try {
    try {
      getJwtBody(event.headers.Authorization.split(" ").at(1) || ""); // Validate bearer token
    } catch {
      logger.error("Error whilst decoding Bearer token body");
      return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
    }

    const result = await getIdentityFromCredentialStore(event.headers.Authorization);

    if (!result.ok) {
      logger.error("Error received from EVCS service", { status: result.status });
      return createErrorResponse(result.status);
    }

    const identityResponse: CredentialStoreIdentityResponse = await result.json();
    const response: UserIdentityResponseMetadata = await createSuccessResponse(identityResponse, request.vtr);

    return { statusCode: HttpCodesEnum.OK, body: JSON.stringify(response) };
  } catch (error) {
    logger.error("Error retrieving user identity", { error });
    return createErrorResponse(HttpCodesEnum.INTERNAL_SERVER_ERROR);
  }
};

const createSuccessResponse = async (
  identityResponse: CredentialStoreIdentityResponse,
  vtr: IdentityVectorOfTrust[]
): Promise<UserIdentityResponseMetadata> => {
  const content: CredentialStoreStoredIdentityJWT = getJwtBody(identityResponse.si.vc);
  const currentVcs: VerifiableCredentialJWT[] = parseCurrentVerifiableCredentials(identityResponse);

  const vot = calculateVot(content.vot as IdentityVectorOfTrust, vtr);

  return {
    content: { ...content, vot },
    vot: content.vot,
    isValid: true,
    expired: await hasFraudCheckExpired(currentVcs),
    kidValid: true,
    signatureValid: true,
  };
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
