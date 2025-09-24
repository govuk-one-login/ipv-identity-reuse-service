import { DIDResolverPlugin } from "@veramo/did-resolver";
import { getResolver } from "web-did-resolver";
import { Resolver } from "did-resolver";
import { JWK, jwtVerify } from "jose";

const resolver = new DIDResolverPlugin({
  resolver: new Resolver({ ...getResolver() }),
});

const didRegex = /^did:web:(?<controller>[\w\-.]+(?::\d+)?(:[\w\-.~%]+)*)#[\w.~%\-:]+$/i;

export const verifySignature = async (kid: string, jwt: string): Promise<void> => {
  const didDocument = await resolver.resolveDid({ didUrl: kid });

  const webKeys = didDocument.didDocument?.verificationMethod;
  jwtVerify(jwt, webKeys?.at(0)?.publicKeyJwk as JWK);
};

export const isValidDidWeb = (did: string): boolean => {
  return didRegex.test(did);
};

export const getDidWebController = (did: string): string => {
  const match = didRegex.exec(did);
  return match?.groups?.controller ?? "";
};
