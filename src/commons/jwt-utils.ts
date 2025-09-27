import { decodeJwt } from "jose";
import { JWTClass } from "@govuk-one-login/data-vocab/credentials";

export const getJwtBody = <T extends JWTClass = JWTClass>(token: string): T => {
  try {
    return decodeJwt(token) as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid JWT: ${msg}`);
  }
};
