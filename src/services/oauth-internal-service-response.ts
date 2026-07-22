export interface AuthorizationSuccessResponse {
  redirectionURI: string;
  authorizationCode: { value: string };
  state: { value: string };
}

export function isValidSuccessResponse(object: unknown): object is AuthorizationSuccessResponse {
  if (!object || typeof object !== "object") return false;
  if (!(
    "redirectionURI" in object &&
    typeof object.redirectionURI === "string" &&
    object.redirectionURI.trim().length > 0
  )) {
    return false;
  }

  if (!("authorizationCode" in object && object.authorizationCode && typeof object.authorizationCode === "object")) {
    return false;
  }

  if (!("state" in object && object.state && typeof object.state === "object")) {
    return false;
  }

  return (
    "value" in object.authorizationCode &&
    typeof object.authorizationCode.value === "string" &&
    object.authorizationCode.value.trim().length > 0 &&
    "value" in object.state &&
    typeof object.state.value === "string" &&
    object.state.value.trim().length > 0
  );
}
