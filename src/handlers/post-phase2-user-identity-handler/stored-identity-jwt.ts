import { IdentityVectorOfTrust, JWTClass } from "@govuk-one-login/data-vocab/credentials.js";

export interface StoredIdentityJWT<VotT extends string = IdentityVectorOfTrust> extends JWTClass {
  sub: string;
  credentials: string[];
  vot: VotT;
  max_vot?: IdentityVectorOfTrust;
  vtm: string;
}
