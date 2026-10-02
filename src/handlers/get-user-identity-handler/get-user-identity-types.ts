import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { StoredIdentityClaims } from "../../domain/stored-identity/stored-identity-types.js";

export interface GetUserIdentityResponse extends StoredIdentityClaims {
  sub: string;
  vot: IdentityVectorOfTrust;
  vtm: string;
  "https://vocab.account.gov.uk/v1/credentialJWT": string[];
  "https://vocab.account.gov.uk/v1/returnCode": string[];
}
