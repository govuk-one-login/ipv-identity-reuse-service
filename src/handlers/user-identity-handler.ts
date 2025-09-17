import { decodeJwt, JWTPayload } from "jose";

import logger from "../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { HttpCodesEnum } from "../types/constants";
import { getConfiguration, getServiceApiKey } from "../types/configuration";
import { EvcsStoredIdentityResponse, StoredIdentityResponse, UserIdentityDataType } from "../types/interfaces";

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

  const configuration = await getConfiguration();
  const serviceApiKey = await getServiceApiKey();

  try {
    try {
      getJwtBody(event.headers.Authorization.split(" ").at(1) || ""); // Validate bearer token
    } catch {
      logger.error("Error whilst decoding Bearer token body");
      return createErrorResponse(HttpCodesEnum.UNAUTHORIZED);
    }

    const result = await fetch(`${configuration.evcsApiUrl}/identity`, {
      method: "GET",
      headers: {
        ...event.headers,
        ...(serviceApiKey && { "x-api-key": serviceApiKey }),
      },
    });

    if (!result.ok) {
      logger.error("Error received from EVCS service", { status: result.status });
      return createErrorResponse(result.status);
    }

    const storedIdentity: EvcsStoredIdentityResponse = await result.json();
    const content = getJwtBody(storedIdentity.si.vc) as unknown as UserIdentityDataType;

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
      error_description = "No Stored identity exists for this user";
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
