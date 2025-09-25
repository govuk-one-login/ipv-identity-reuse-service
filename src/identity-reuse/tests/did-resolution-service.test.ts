import { didDocument } from "../../../shared-test/jwt-utils";
import { getDidWebController, isValidDidWeb, resolver } from "../did-resolution-service";
import { DIDResolutionResult } from "did-resolver";

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

  beforeAll(() => {
    resolver.resolve = jest.fn().mockResolvedValue(DEFAULT_DID_RESOLUTION_RESPONSE);
  });
  it("should cache calls to ", () => {});
});
