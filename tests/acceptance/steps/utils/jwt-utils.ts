import { base64url, JWTHeaderParameters, JWTPayload } from "jose";
import { randomString } from "./string-utils";
import { JWTClass } from "@govuk-one-login/data-vocab/credentials";

export const sign = (jwtHeader: JWTHeaderParameters, jwtPayload: JWTPayload | JWTClass): string => {
  const header = base64url.encode(Buffer.from(JSON.stringify(jwtHeader)));
  const payload = base64url.encode(Buffer.from(JSON.stringify(jwtPayload)));
  return `${header}.${payload}.`;
};

export function getDefaultStoredIdentityHeader(alg: string = "EC"): JWTHeaderParameters {
  return {
    alg,
    typ: "JWT",
    kid: Buffer.from(randomString(16)).toString("base64"),
  };
}
