import { did, didDocument, publicKeyJwk, verificationMethodId } from "../../../shared-test/jwt-utils";
import {
  clearCache,
  getDidWebController,
  getPublicKeyJwkForKid,
  isValidDidWeb,
  resolver,
} from "../did-resolution-service";
import { DIDDocument, DIDResolutionResult } from "did-resolver";

describe("isValidDidWeb", () => {
  it.each([
    "did:web:example.com#key-1",
    "did:web:example.com:subfolder#key-1",
    "did:web:example.com:subfolder#1D8456ABCEC3.B81A09-8342fff",
  ])("it should match valid did:web IDs", (kid: string) => {
    expect(isValidDidWeb(kid)).toEqual(true);
  });
  it.each([
    "did:web:example.com",
    "did:another-method:example.com#key-1",
    "not:a:did:uri#key-1",
    "f5fe5d2a-9eb6-4819-8c46-723e3a21565a",
  ])("it should not match invalid did:web IDs", (kid: string) => {
    expect(isValidDidWeb(kid)).toEqual(false);
  });
});

describe("getDidWebController", () => {
  it("it should correctly extract the controller ID", () => {
    expect(getDidWebController("did:web:example.com#key-1")).toEqual("example.com");
  });
  it("it should correctly extract the controller ID including path portion", () => {
    expect(getDidWebController("did:web:example.com:sub-folder#key-1")).toEqual("example.com:sub-folder");
    expect(getDidWebController("did:web:example.com:sub-folder:sub-sub-folder#key-1")).toEqual(
      "example.com:sub-folder:sub-sub-folder"
    );
  });
});

describe("getPublicKeyJwkForKid", () => {
  const DEFAULT_DID_RESOLUTION_RESPONSE = { didDocument } as DIDResolutionResult;

  beforeEach(() => {
    resolver.resolve = jest.fn().mockResolvedValue(DEFAULT_DID_RESOLUTION_RESPONSE);
    clearCache();
  });

  it("should fetch a non-cached version from the DID endpoint resolved from kid", async () => {
    const jwk = await getPublicKeyJwkForKid(verificationMethodId);

    expect(jwk).toEqual(publicKeyJwk);
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("should fetch a cached version of JWK on subsequent calls with same kid", async () => {
    await getPublicKeyJwkForKid(verificationMethodId);
    const jwk = await getPublicKeyJwkForKid(verificationMethodId);

    expect(jwk).toEqual(publicKeyJwk);
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("throws error if matching key material not found in retrieved did document", async () => {
    const badVerificationMethodId = `${did}#non-existent-key-id`;
    await expect(getPublicKeyJwkForKid(badVerificationMethodId)).rejects.toThrow("Cannot resolve kid to a JWK");
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });

  it("throws error if unexpected formatting of DID document", async () => {
    const badDidDocument: DIDDocument = {
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
      assertionMethod: [verificationMethodId],
    };

    resolver.resolve = jest.fn().mockResolvedValue({ didDocument: badDidDocument });
    await expect(getPublicKeyJwkForKid(verificationMethodId)).rejects.toThrow(
      "Assertion method as string not supported"
    );
    expect(resolver.resolve).toHaveBeenCalledTimes(1);
  });
});
