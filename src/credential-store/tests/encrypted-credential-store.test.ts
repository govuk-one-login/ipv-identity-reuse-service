import { CredentialStoreIdentityResponse, JWTIncludingStateAndMetadata } from "../credential-store-identity-response";
import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { getDefaultJwtHeader, sign } from "../../../shared-test/jwt-utils";
import { parseCurrentVerifiableCredentials } from "../encrypted-credential-store";

describe("parseCurrentVerifiableCredentials", () => {
  it("should return verifiable credentials with CURRENT state only", () => {
    const identityResponse: CredentialStoreIdentityResponse = {
      si: {
        state: "doesThisActuallyHaveState",
        vc: "jwtString",
        metadata: null,
      },
      vcs: [
        createVerifiableCredentialWithState("iss1", "CURRENT"),
        createVerifiableCredentialWithState("iss2", "CURRENT"),
        createVerifiableCredentialWithState("iss3", "HISTORIC"),
        createVerifiableCredentialWithState("iss4", "PENDING_RETURN"),
      ],
    };

    const result = parseCurrentVerifiableCredentials(identityResponse);
    expect(result).toHaveLength(2);
    expect(result.map((vc) => vc.iss)).toContain("iss1");
    expect(result.map((vc) => vc.iss)).toContain("iss2");
  });
});

const createVerifiableCredentialWithState = (issuer: string, state: string): JWTIncludingStateAndMetadata => {
  return {
    state: state,
    vc: sign(getDefaultJwtHeader(), getVerifiableCredential(issuer)),
    metadata: null,
  };
};

const getVerifiableCredential = (issuer: string): IdentityCheckCredentialJWTClass => {
  return {
    iss: issuer,
    nbf: 1234,
    sub: "user1234",
    vc: {
      evidence: [],
    },
  };
};
