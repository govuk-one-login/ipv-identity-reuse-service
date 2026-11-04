import { HttpCodesEnum } from "./constants.js";

export type ErrorCodes =
  | "access_denied"
  | "delete_session_error"
  | "get_session_error"
  | "invalid_request"
  | "invalid_session"
  | "service_error";

export class BaseServiceError extends Error {
  constructor(
    public errorCode: ErrorCodes,
    errorDescription?: string,
    options?: ErrorOptions
  ) {
    super(errorDescription, options);
    this.name = "BaseError";
  }
}

export class TokenValidationError extends BaseServiceError {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("service_error", "Token validation failed");
    this.name = "TokenValidationError";
  }
}

export class EVCSError extends BaseServiceError {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("service_error", "EVCS request failed");
    this.name = "EVCSError";
  }
}

export class UserIdentityError extends BaseServiceError {
  constructor(message?: string) {
    super("service_error", message);
    this.name = "UserIdentityError";
  }
}

export const AccessDenied = createError("AccessDenied", "access_denied");
export const ConfigurationError = createError("ConfigurationError", "service_error");
export const DeleteSessionError = createError("DeleteSessionError", "delete_session_error");
export const GetSessionError = createError("GetSessionError", "get_session_error");
export const InvalidRequest = createError("InvalidRequest", "invalid_request");
export const JsonParseError = createError("JsonParseError", "service_error");
export const PolicyGenerationError = createError("PolicyGenerationError", "service_error");
export const ServerError = createError("ServerError", "service_error");
export const SessionInvalidError = createError("SessionInvalidError", "invalid_session");
export const StoredIdentityHashMismatchError = createError("StoredIdentityHashMismatchError", "service_error");
export const StoredIdentityValidationError = createError("StoredIdentityValidationError", "service_error");

function createError(className: string, code: ErrorCodes = "service_error") {
  const CustomError = class extends BaseServiceError {
    constructor(message?: string, options?: ErrorOptions) {
      super(code, message, options);
      this.name = className;
    }
  };

  Object.defineProperty(CustomError, "name", { value: className });

  return CustomError;
}

export const isSuccessResponse = (status: number): boolean => {
  return status >= 200 && status < 400;
};

export const isClientError = (status: number): boolean => {
  return status >= 400 && status < 500;
};

export const isServiceError = (status: number): boolean => {
  return status >= 500 && status < 600;
};
