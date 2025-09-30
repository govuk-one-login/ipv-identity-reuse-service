import { decodeJwt, JWTPayload } from "jose";

import logger from "../../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { HttpCodesEnum } from "../../commons/constants";
import { getIdentityFromCredentialStore } from "../../credential-store/encrypted-credential-store";
import { CredentialStoreIdentityResponse } from "../../credential-store/credential-store-identity-response";
import { UserIdentityResponse as CredentialStoreStoreIdentityVC } from "./user-identity-response";
import { UserIdentityResponseMetadata } from "./user-identity-response-metadata";
import { isSiValid } from "../../commons/calculate-si-is-valid";
import { UserIdentityRequest } from "./user-identity-request";

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
    const response: UserIdentityResponseMetadata = createSuccessResponse(identityResponse, request.vtr);

    return { statusCode: HttpCodesEnum.OK, body: JSON.stringify(response) };
  } catch (error) {
    logger.error("Error retrieving user identity", { error });
    return createErrorResponse(HttpCodesEnum.INTERNAL_SERVER_ERROR);
  }
};

const getJwtBody = <T extends JWTPayload = JWTPayload>(token: string): T => {
  try {
    return decodeJwt(token) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JWT: ${msg}`);
  }
};

const createSuccessResponse = (
  storedIdentity: CredentialStoreIdentityResponse,
  vtr: string[]
): UserIdentityResponseMetadata => {
  const content: CredentialStoreStoreIdentityVC = getJwtBody(storedIdentity.si.vc);
  const { vot, isValid } = isSiValid(content.vot, vtr);

  return {
    content: { ...content, vot },
    vot: content.vot,
    isValid,
    expired: false,
    kidValid: true,
    signatureValid: true,
  };
};

const createErrorResponse = (errorCode: HttpCodesEnum): APIGatewayProxyResult => {
  let error;
  let error_description;
  switch (errorCode) {
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
