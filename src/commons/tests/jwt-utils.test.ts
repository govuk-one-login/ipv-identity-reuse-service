import { getDefaultStoredIdentityHeader, sign } from "../../../shared-test/jwt-utils";
import { getJwtBody, getJwtSignature } from "../jwt-utils";

describe("getJwtBody", () => {
  it("should decode a valid JWT", async () => {
    const validJwtBody = {
      iss: "iss",
      sub: "sub",
    };
    const testJwt = await sign(getDefaultStoredIdentityHeader(), validJwtBody);
    expect(getJwtBody(testJwt)).toEqual(validJwtBody);
  });

  it("should throw when decoding an invalid JWT", () => {
    const testJwt = "invalidJWT";
    expect(() => getJwtBody(testJwt)).toThrow(Error);
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
