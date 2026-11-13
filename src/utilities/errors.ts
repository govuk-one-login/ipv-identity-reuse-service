import { HttpCodesEnum } from "./constants.js";

export type ErrorCodes = "bad_request" | "forbidden" | "service_error";

export class BaseServiceError extends Error {
  constructor(errorDescription?: string, options?: ErrorOptions) {
    super(errorDescription, options);
    this.name = "BaseError";
  }
}

export class TokenValidationError extends BaseServiceError {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("Token validation failed");
    this.name = "TokenValidationError";
  }
}

export class EVCSError extends BaseServiceError {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("EVCS request failed");
    this.name = "EVCSError";
  }
}

export class UserIdentityError extends BaseServiceError {
  constructor(message?: string) {
    super(message);
    this.name = "UserIdentityError";
  }
}

export const ConfigurationError = createError("ConfigurationError");
export const DeleteSessionError = createError("DeleteSessionError");
export const GetSessionError = createError("GetSessionError");
export const JsonParseError = createError("JsonParseError");
export const PolicyGenerationError = createError("PolicyGenerationError");
export const ServerError = createError("ServerError");
export const SessionInvalidError = createError("SessionInvalidError");
export const StoredIdentityHashMismatchError = createError("StoredIdentityHashMismatchError");
export const StoredIdentityValidationError = createError("StoredIdentityValidationError");

function createError(className: string) {
  const CustomError = class extends BaseServiceError {
    constructor(message?: string, options?: ErrorOptions) {
      super(message, options);
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
