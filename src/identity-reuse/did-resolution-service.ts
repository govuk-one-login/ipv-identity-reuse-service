import { getResolver } from "web-did-resolver";
import { Resolver, VerificationMethod } from "did-resolver";

import { JWK } from "jose";

const cache = new Map<string, JWK>();
const webResolver = getResolver();

export const resolver = new Resolver({
  ...webResolver,
});

const didRegex = /^did:web:(?<controller>[\w\-.]+(?::\d+)?(:[\w\-.~%]+)*)#[\w.~%\-:]+$/i;

export const getPublicKeyJwkForKid = async (kid: string): Promise<JWK> => {
  if (cache.has(kid)) {
    return cache.get(kid) as JWK;
  }
  const didResolution = await resolver.resolve(kid);
  const webKeys = didResolution.didDocument?.assertionMethod;
  const verificationMethod = webKeys?.map(extractAssertionMethodJwk).find((key) => key.id == kid);
  if (verificationMethod) {
    const publicKeyJwk = verificationMethod?.publicKeyJwk as JWK;
    cache.set(kid, publicKeyJwk);
    return publicKeyJwk;
  }
  throw new Error("Cannot resolve kid to a JWK");
};

const extractAssertionMethodJwk = (method?: string | VerificationMethod): VerificationMethod => {
  switch (typeof method) {
    case "object":
      return method;
    case "string":
      throw new Error("Assertion method as string not supported.");
    default:
      throw new Error("Assertion method not defined on document.");
  }
};

export const isValidDidWeb = (did: string): boolean => {
  return didRegex.test(did);
};

export const getDidWebController = (did: string): string => {
  const match = didRegex.exec(did);
  return match?.groups?.controller ?? "";
};
