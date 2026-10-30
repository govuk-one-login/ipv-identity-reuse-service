import logger from "../../../utilities/logger.js";
import { callSessionApi } from "../../../api/oauth-internal-api.js";
import {
  redirectToConfirmDetailsExpress,
  redirectToErrorPageExpress,
  redirectToBadRequestExpress,
} from "../../../api/sis-api.js";
import { isStringWithLength } from "../../../utilities/string-utilities.js";
import { RequestHandler } from "express";

export type AuthorizationQueryStringParameters = {
  client_id: string;
  request: string;
};

export const handler: RequestHandler = async (request, response) => {
  if (!isValidQueryParameters(request.query)) {
    logger.error("Parameters are invalid");
    return redirectToBadRequestExpress(response);
  }

  try {
    const { client_id: clientId, request: requestParameter } = request.query;
    const apiResponse = await callSessionApi(clientId, requestParameter);

    redirectToConfirmDetailsExpress(response, apiResponse.session_id);
  } catch (error) {
    logger.error(`Error calling session handler: ${error}`);
    return redirectToErrorPageExpress(response);
  }
};

export function isValidQueryParameters(object: unknown): object is AuthorizationQueryStringParameters {
  if (!object || typeof object !== "object") {
    return false;
  }

  return (
    "client_id" in object &&
    isStringWithLength(object.client_id) &&
    "request" in object &&
    isStringWithLength(object.request)
  );
}
