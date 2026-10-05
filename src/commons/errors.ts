import { HttpCodesEnum } from "./constants.js";

export class PolicyGenerationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PolicyGenerationError";
  }
}

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

export class StoredIdentityValidationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "StoredIdentityValidationError";
  }
}

export class StoredIdentityHashMismatchError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "StoredIdentityHashMismatchError";
  }
}

export class UserIdentityError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "StoredIdentityNotFoundError";
  }
}

export class GetSessionError extends Error {
  constructor(
    message: string | undefined,
    public readonly statusCode?: HttpCodesEnum
  ) {
    super(message);
    this.name = "GetSessionError";
  }
}

export class SessionInvalidError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "SessionInvalidError";
  }
}
