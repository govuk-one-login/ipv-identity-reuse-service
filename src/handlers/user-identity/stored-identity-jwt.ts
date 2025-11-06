import { IdentityVectorOfTrust, JWTClass } from "@govuk-one-login/data-vocab/credentials";

export interface StoredIdentityJWT<VotT extends IdentityVectorOfTrust = IdentityVectorOfTrust> extends JWTClass {
  sub: string;
  credentials: string[];
  vot: VotT;
  max_vot?: IdentityVectorOfTrust;
  vtm: string;
}
