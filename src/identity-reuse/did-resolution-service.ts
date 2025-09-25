import { DIDResolverPlugin } from "@veramo/did-resolver";
import { getResolver } from "web-did-resolver";
import { Resolver } from "did-resolver";
import { JWK, jwtVerify } from "jose";

const resolver = new DIDResolverPlugin({
  resolver: new Resolver({ ...getResolver() }),
});

const didRegex = /^did:web:(?<controller>[a-z0-9.-]+(?::\d+)?(?:[:][a-z0-9._~%-]+)*)#(?<kid>[A-Za-z0-9._~%-:]+)$/i;

export const verifySignature = async (kid: string, jwt: string): Promise<boolean> => {
  const didDocument = await resolver.resolveDid({ didUrl: kid });

  const webKeys = didDocument.didDocument?.verificationMethod;
  try {
    jwtVerify(jwt, webKeys?.at(0)?.publicKeyJwk as JWK);
  } catch {
    return false;
  }
  return true;
};

export const isValidDidWeb = (did: string): boolean => {
  return didRegex.test(did);
};

export const getDidWebController = (did: string): string => {
  const match = didRegex.exec(did);
  return match?.groups?.controller ?? "";
};
