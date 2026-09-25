import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials.js";
import { getDefaultJwtHeader, sign } from "../../../shared-test/jwt-utilities.js";
import { VerifiableCredentialObject } from "../evcs-api.js";
import { describe, it, expect } from "vitest";

describe("temporarily empty", () => {
  it("temporarily empty", async () => {
    await createVerifiableCredentialWithState("iss1", "CURRENT");
    expect(true).toBe(true);
  });
});

const createVerifiableCredentialWithState = async (
  issuer: string,
  state: string
): Promise<VerifiableCredentialObject> => {
  return {
    state: state,
    vc: await sign(getDefaultJwtHeader(), getVerifiableCredential(issuer)),
    metadata: undefined,
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
