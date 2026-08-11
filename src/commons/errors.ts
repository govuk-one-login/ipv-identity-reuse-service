import { HttpCodesEnum } from "./constants";

export class PolicyGenerationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PolicyGenerationError";
  }
}

export class TokenValidationError extends Error {
  constructor(public readonly statuscode: HttpCodesEnum) {
    super("Token validation failed");
    this.name = "TokenValidationError";
  }
}

export class CredentialStoreError extends Error {
  constructor(
    public readonly statusCode: HttpCodesEnum,
    public readonly userId: string,
    public readonly journeyId?: string
  ) {
    super("Credential store request failed");
    this.name = "CredentialStoreError";
  }
}
