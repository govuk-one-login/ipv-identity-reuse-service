import { base64url, exportJWK, importSPKI, JWK } from "jose";

export const binaryPkToJwk = async (pk: Uint8Array, alg: string) => {
  return await exportJWK(await getSpki(pk, alg));
};

const getSpki = async (pk: Uint8Array, alg: string) => {
  const base64Pk = base64url.encode(pk);
  return await importSPKI("-----BEGIN PUBLIC KEY-----" + base64Pk + "-----END PUBLIC KEY-----", alg);
};

export const updateJwk = (jwk: JWK, options: { alg: string }): JWK => {
  return { ...jwk, ...options };
};
