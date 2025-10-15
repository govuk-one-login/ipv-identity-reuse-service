import { getDefaultStoredIdentityHeader, sign } from "../../../shared-test/jwt-utils";
import { getJwtBody, getJwtHeader, getJwtSignature } from "../jwt-utils";

const validJwtBody = {
  iss: "iss",
  sub: "sub",
};
const validJwtHeader = getDefaultStoredIdentityHeader();
describe("getJwtBody", () => {
  it("should decode a valid JWT", async () => {
    const testJwt = await sign(validJwtHeader, validJwtBody);
    expect(getJwtBody(testJwt)).toEqual(validJwtBody);
  });

  it("should throw when decoding an invalid JWT", () => {
    const testJwt = "invalidJWT";
    expect(() => getJwtBody(testJwt)).toThrow("Invalid JWT");
  });
});

describe("getJwtHeader", () => {
  it("should decode a valid JWT", async () => {
    const testJwt = await sign(validJwtHeader, validJwtBody);
    expect(getJwtHeader(testJwt)).toEqual(validJwtHeader);
  });

  it("should throw when decoding an invalid JWT", () => {
    const testJwt = "invalidJWT";
    expect(() => getJwtBody(testJwt)).toThrow("Invalid JWT");
  });
});

describe("getJwtSignature", () => {
  it("should return the signature string from a JWT string", () => {
    const encodedJwt = "header.body.signature";
    expect(getJwtSignature(encodedJwt)).toEqual("signature");
  });

  it.each(["stringwithnodots", "string.with.too.many.dots", "string.withemptysignature."])(
    'should return undefined for badly formed JWT string: "%s"',
    (badEncodedJwt: string) => {
      expect(getJwtSignature(badEncodedJwt)).toBeUndefined();
    }
  );
});
