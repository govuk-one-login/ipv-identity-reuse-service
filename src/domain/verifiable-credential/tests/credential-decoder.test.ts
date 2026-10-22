import { describe, expect, it } from "vitest";
import { VerifiableCredentialJWT } from "../verifiable-credential-types.js";
import { getDefaultJwtHeader, sign } from "../../../../shared-test/jwt-utilities.js";
import { parseVerifiableCredentials } from "../credential-decoder.js";

const createMockVc = async (issuer: string): Promise<{ encoded: string; decoded: VerifiableCredentialJWT }> => {
  const decoded: VerifiableCredentialJWT = {
    iss: issuer,
    nbf: Math.floor(Date.now() / 1000),
    sub: "test-user",
    vc: { evidence: [], type: ["VerifiableCredential", "IdentityCheckCredential"] },
  } as unknown as VerifiableCredentialJWT;
  return { encoded: await sign(getDefaultJwtHeader(), decoded), decoded };
};

describe("parseVerifiableCredentials", () => {
  it("should return decoded credentials", async () => {
    const mock1 = await createMockVc("iss1");
    const mock2 = await createMockVc("iss2");

    const parsedResult = parseVerifiableCredentials([mock1.encoded, mock2.encoded]);
    expect(parsedResult).toContainEqual(mock1.decoded);
    expect(parsedResult).toContainEqual(mock2.decoded);
  });
});
