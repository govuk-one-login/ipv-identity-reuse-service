import { decodeJwt, decodeProtectedHeader, ProtectedHeaderParameters } from "jose";
import { JWTClass } from "@govuk-one-login/data-vocab/credentials";

export const getJwtBody = <T extends JWTClass = JWTClass>(token: string): T => {
  return decodeJwt(token) as T;
};

export const getJwtSignature = (encodedJwt: string): string | undefined => {
  let signature = undefined;

  const jwtParts = encodedJwt.split(".");
  if (jwtParts.length === 3) {
    const lastJwtPart = jwtParts.at(2);
    if (lastJwtPart !== "") {
      signature = lastJwtPart;
    }
  }
  return signature;
};

export const getJwtHeader = <T extends ProtectedHeaderParameters>(token: string): T => {
  return decodeProtectedHeader(token) as T;
};
