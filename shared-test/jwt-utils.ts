import { DIDDocument } from "did-resolver";
import { CompactJWSHeaderParameters, CompactSign, importJWK, JWK, JWTHeaderParameters } from "jose";
import { signKms } from "../tests/acceptance/steps/utils/kms-utils";

export const privateKeyJwk: JWK = {
  kty: "EC",
  crv: "P-256",
  x: "f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU", // pragma: allowlist secret
  y: "x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0", // pragma: allowlist secret
  d: "jpsQnnGQmL-YBIffH1136cspYG6-0iY7X1fCE9-E9LI", // pragma: allowlist secret
};

export const publicKeyJwk: JWK = {
  kty: "EC",
  crv: "P-256",
  x: privateKeyJwk.x,
  y: privateKeyJwk.y,
};

export const did = "did:web:api.identity.dev.account.gov.uk:issuer";
export const verificationMethodId = `${did}#key-1`;

export const didDocument: DIDDocument = {
  "@context": ["https://www.w3.org/ns/did/v1", "https://w3id.org/security/jws/v1"],
  id: did,
  controller: did,
  verificationMethod: [
    {
      id: verificationMethodId,
      type: "JsonWebKey2020",
      controller: did,
      publicKeyJwk,
    },
  ],
  authentication: [verificationMethodId],
  assertionMethod: [verificationMethodId],
};

export async function sign(
  header: Record<string, any>,
  body: Record<string, any>,
  kms: boolean = false
): Promise<string> {
  const protectedHeader: CompactJWSHeaderParameters = {
    typ: header?.typ ?? "JWT",
    kid: header?.kid ?? verificationMethodId,
    alg: header?.alg ?? "ES256",
    ...header,
  };
  return kms ? await signKms(body, protectedHeader) : await signLocal(body, protectedHeader);
}

async function signLocal(body: Record<string, any>, protectedHeader: CompactJWSHeaderParameters) {
  const key = await importJWK(privateKeyJwk, "ES256");
  const payloadBytes = new TextEncoder().encode(JSON.stringify(body));
  return await new CompactSign(payloadBytes).setProtectedHeader(protectedHeader).sign(key);
}

export function getDefaultStoredIdentityHeader(
  alg: string = "ES256",
  kid = "did:web:api.identity.dev.account.gov.uk#f5fe5d2a-9eb6-4819-8c46-723e3a21565a"
): JWTHeaderParameters {
  return {
    alg,
    typ: "JWT",
    kid,
  };
}
