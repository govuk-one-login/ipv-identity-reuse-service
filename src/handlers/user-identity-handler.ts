import { decodeJwt, JWTPayload } from "jose";

import logger from "../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { HttpCodesEnum } from "../types/constants";
import { StoredIdentityResponse, UserIdentityDataType } from "../types/interfaces";
import { getIdentityFromCredentialStore } from "../credential-store/encrypted-credential-store";
import { CredentialStoreIdentityResponse } from "../credential-store/credential-store-identity-response";

interface ErrorResponse {
  error: string;
  error_description: string;
}

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
  logger.addContext(context);

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
    const content = getJwtBody(identityResponse.si.vc) as unknown as UserIdentityDataType;

    const response: StoredIdentityResponse = {
      content,
      vot: content.vot,
      isValid: true,
      expired: false,
      kidValid: true,
      signatureValid: true,
    };
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
