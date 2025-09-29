import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { JWTPayload } from "jose";

export interface UserIdentityResponse extends JWTPayload {
  sub: string;
  vot: IdentityVectorOfTrust;
  vtm: string[];
}
