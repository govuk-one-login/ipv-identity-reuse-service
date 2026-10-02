import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { StoredIdentityClaims, CalculatedVectorOfTrust } from "../../domain/stored-identity/stored-identity-types.js";

export interface UserIdentityRequest {
  vtr: IdentityVectorOfTrust[];
  govukSigninJourneyId: string;
}

export interface UserIdentityResponse {
  content: UserIdentityContent;
  isValid: boolean;
  expired: boolean;
  vot: IdentityVectorOfTrust;
  kidValid: boolean;
  signatureValid: boolean;
}

interface UserIdentityContent {
  sub: string;
  vot: CalculatedVectorOfTrust;
  vtm: string;
  credentials: string[];
  claims: StoredIdentityClaims;
}

export interface UserIdentityErrorResponse {
  error: string;
  error_description: string;
}
