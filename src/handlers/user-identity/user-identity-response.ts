import { IdentityVectorOfTrust, JWTClass } from "@govuk-one-login/data-vocab/credentials";

export interface UserIdentityResponse extends JWTClass {
  sub: string;
  credentials: string[];
  vot: IdentityVectorOfTrust | "P0";
  vtm: string;
}
