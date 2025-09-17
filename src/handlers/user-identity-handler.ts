import { decodeJwt, JWTPayload } from "jose";

import logger from "../commons/logger";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HttpCodesEnum } from "../types/constants";
import { getConfiguration, getServiceApiKey } from "../types/configuration";
import { EvcsStoredIdentityResponse, StoredIdentityResponse, UserIdentityDataType } from "../types/interfaces";

const AUTH_ERROR_RESPONSE = {
  statusCode: HttpCodesEnum.UNAUTHORIZED,
  body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.debug("Received message", { event: event.body });
  if (!event?.headers?.Authorization) {
    return AUTH_ERROR_RESPONSE;
  }

  const configuration = await getConfiguration();
  const serviceApiKey = await getServiceApiKey();

  try {
    try {
      getJwtBody(event.headers.Authorization.split(" ").at(1) || ""); // Validate bearer token
    } catch {
      return {
        statusCode: HttpCodesEnum.UNAUTHORIZED,
        body: JSON.stringify({ error: "invalid_token", error_description: "Bearer token is missing or invalid" }),
      };
    }

    const result = await fetch(`${configuration.evcsApiUrl}/identity`, {
      method: "GET",
      headers: {
        ...event.headers,
        ...(serviceApiKey && { "x-api-key": serviceApiKey }),
      },
    });

    if (!result.ok) {
      return { statusCode: result.status, body: JSON.stringify(renderError(result)) };
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
    return {
      statusCode: HttpCodesEnum.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ error: "server_error", error_description: "Unable to retrieve data" }),
    };
  }
};

const getJwtBody = <T extends JWTPayload = JWTPayload>(token: string): T => {
  try {
    const payload = decodeJwt(token) as T;
    return payload;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JWT: ${msg}`);
  }
};

function renderError(result: Response) {
  let error;
  let error_description;
  switch (result.status) {
    case HttpCodesEnum.NOT_FOUND:
      error = "not_found";
      error_description = "No Stored identity exists for this user.";
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
  return { error, error_description };
}
