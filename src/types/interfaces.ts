import {
  IdentityCheckCredentialJWTClass,
  RiskAssessmentCredentialJWTClass,
  SecurityCheckCredentialJWTClass,
} from "@govuk-one-login/data-vocab/credentials";

export type VerifiableCredentialJWT =
  | IdentityCheckCredentialJWTClass
  | RiskAssessmentCredentialJWTClass
  | SecurityCheckCredentialJWTClass;
