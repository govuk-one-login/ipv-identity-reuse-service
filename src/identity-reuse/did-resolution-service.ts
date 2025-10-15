import { getResolver } from "web-did-resolver";
import { Resolver, VerificationMethod, parse } from "did-resolver";

import { JWK } from "jose";

const cache = new Map<string, JWK>();
const webResolver = getResolver();

export const resolver = new Resolver({
  ...webResolver,
});

export const getPublicKeyJwkForKid = async (kid: string): Promise<JWK> => {
  if (cache.has(kid)) {
    return cache.get(kid) as JWK;
  }
  const didResolution = await resolver.resolve(kid);
  const webKeys = didResolution.didDocument?.assertionMethod;
  const verificationMethod = webKeys?.map(extractAssertionVerificationMethod).find((key) => key.id == kid);
  if (verificationMethod) {
    const publicKeyJwk = verificationMethod.publicKeyJwk as JWK;
    cache.set(kid, publicKeyJwk);
    return publicKeyJwk;
  }
  throw new Error("Cannot resolve kid to a JWK");
};

const extractAssertionVerificationMethod = (method?: string | VerificationMethod): VerificationMethod => {
  if (typeof method === "object") {
    return method;
  }
  throw new Error("Assertion method as string not supported");
};

export const isValidDidWeb = (did: string): boolean => {
  const result = parse(did);
  const keyId = result?.fragment;
  return !!result && !!keyId; // enforces existence of keyId in DIDs
};

export const getDidWebController = (did: string): string => {
  return parse(did)?.id || "";
};

export const clearCache = (): void => {
  cache.clear();
};
