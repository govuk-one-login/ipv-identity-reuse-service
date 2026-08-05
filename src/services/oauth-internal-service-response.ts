export interface AuthorizationSuccessResponse {
  redirectionURI: string;
  authorizationCode: { value: string };
  state: { value: string };
}

export interface SessionSuccessResponse {
  session_id: string;
  state: string;
  redirect_uri: string;
}

export function isValidAuthorizationSuccessResponse(object: unknown): object is AuthorizationSuccessResponse {
  if (!object || typeof object !== "object") return false;
  return (
    hasNonEmptyString(object, "redirectionURI") &&
    hasObjectWithNonEmptyValue(object, "authorizationCode") &&
    hasObjectWithNonEmptyValue(object, "state")
  );
}

export function isValidSessionSuccessResponse(object: unknown): object is SessionSuccessResponse {
  if (!object || typeof object !== "object") return false;
  return (
    hasNonEmptyString(object, "redirect_uri") &&
    hasNonEmptyString(object, "session_id") &&
    hasNonEmptyString(object, "state")
  );
}

function hasNonEmptyString(object: object, key: string): boolean {
  return (
    key in object &&
    typeof (object as Record<string, unknown>)[key] === "string" &&
    ((object as Record<string, unknown>)[key] as string).trim().length > 0
  );
}

function hasObjectWithNonEmptyValue(object: object, key: string): boolean {
  return (
    key in object &&
    !!(object as Record<string, unknown>)[key] &&
    typeof (object as Record<string, unknown>)[key] === "object" &&
    hasNonEmptyString((object as Record<string, unknown>)[key] as object, "value")
  );
}
