import { HttpCodesEnum } from "./constants.js";

export const PolicyGenerationError = createError("PolicyGenerationError");

export class TokenValidationError extends Error {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("Token validation failed");
    this.name = "TokenValidationError";
  }
}

export class EVCSError extends Error {
  constructor(public readonly statusCode: HttpCodesEnum) {
    super("EVCS request failed");
    this.name = "EVCSError";
  }
}

export const StoredIdentityValidationError = createError("StoredIdentityValidationError");

export const StoredIdentityHashMismatchError = createError("StoredIdentityHashMismatchError");

export class UserIdentityError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "StoredIdentityNotFoundError";
  }
}

export const GetSessionError = createError("GetSessionError");

export const DeleteSessionError = createError("DeleteSessionError");

export const SessionInvalidError = createError("SessionInvalidError");

export const JsonParseError = createError("JsonParseError");

export const ConfigurationError = createError("ConfigurationError");

function createError(className: string) {
  const CustomError = class extends Error {
    constructor(message?: string, options?: ErrorOptions) {
      super(message, options);
      this.name = className;
    }
  };

  Object.defineProperty(CustomError, "name", { value: className });

  return CustomError;
}
