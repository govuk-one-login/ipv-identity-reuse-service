import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { StoredIdentityJWT } from "./stored-identity-jwt";

export type StoredIdentityVectorOfTrust = IdentityVectorOfTrust | "P0";

export type UserIdentityResponse = {
  content: StoredIdentityJWT<StoredIdentityVectorOfTrust>;
  isValid: boolean;
  expired: boolean;
  vot: IdentityVectorOfTrust;
  kidValid: boolean;
  signatureValid: boolean;
};
