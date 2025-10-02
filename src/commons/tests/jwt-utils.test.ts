import { getDefaultStoredIdentityHeader, sign } from "../../../tests/acceptance/steps/utils/jwt-utils";
import { getJwtBody } from "../jwt-utils";

describe("getJwtBody", () => {
  it("should decode a valid JWT", () => {
    const validJwtBody = {
      iss: "iss",
      sub: "sub",
    };
    const testJwt = sign(getDefaultStoredIdentityHeader(), validJwtBody);
    expect(getJwtBody(testJwt)).toEqual(validJwtBody);
  });

  it("should throw when decoding an invalid JWT", () => {
    const testJwt = "invalidJWT";
    expect(() => getJwtBody(testJwt)).toThrow(Error);
  });
});
