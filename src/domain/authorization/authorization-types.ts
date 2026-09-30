import { isStringWithLength } from "../../commons/string-utilities.js";

export type AuthorizationQueryStringParameters = {
  client_id: string;
  request: string;
};

export function isValidQueryParameters(object: unknown): object is AuthorizationQueryStringParameters {
  if (!object || typeof object !== "object") {
    return false;
  }

  return "client_id" in object && isStringWithLength(object.client_id);
}
