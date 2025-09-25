import {
  IdentityCheckCredentialJWTClass,
  RiskAssessmentCredentialJWTClass,
  SecurityCheckCredentialJWTClass,
} from "@govuk-one-login/data-vocab/credentials";

export interface UserIdentityInput {
  govukSigninJourneyId: string;
  vtr: string[];
}

export interface UserIdentityDataType {
  sub: string;
  vot: string;
  vtm: string[];
}
export interface StoredIdentityResponse {
  content: UserIdentityDataType;
  isValid: boolean;
  expired: boolean;
  vot: string;
  kidValid: boolean;
  signatureValid: boolean;
}

export type VerifiableCredentialJWT =
  | IdentityCheckCredentialJWTClass
  | RiskAssessmentCredentialJWTClass
  | SecurityCheckCredentialJWTClass;
