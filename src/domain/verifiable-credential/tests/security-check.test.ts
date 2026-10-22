import { describe, expect, it } from "vitest";
import { SecurityCheckCredentialJWTClass, VerifiableCredentialType } from "@govuk-one-login/data-vocab/credentials.js";
import { Configuration } from "../../../configuration/configuration.js";
import { getSecurityCheckCredential } from "../security-check.js";

describe("getSecurityCheckCredential", () => {
  const mockConfig: Configuration = {
    ciReturnCodes: [{ ci: "", returnCode: "" }],
    controllerAllowList: [],
    evcsApiUrl: "",
    fraudIssuer: ["fraudCRI"],
    fraudValidityPeriod: 180,
    interventionCodesToInvalidate: [],
    securityCheckIssuer: "securityCRI",
    vtm: "https://vtm.example.com",
  };

  it("should return security check credential with configured issuer", () => {
    const identityCheck1 = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI", "SecurityCheckCredential");
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");
    const credentialBundle = [identityCheck1, securityCheck, identityCheck2];

    expect(getSecurityCheckCredential(credentialBundle, mockConfig)).toEqual(securityCheck);
  });

  it("should return undefined if configured issuer is not security check credential", () => {
    const identityCheck1 = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI5", "SecurityCheckCredential");
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");
    const credentialBundle = [identityCheck1, securityCheck, identityCheck2];

    expect(getSecurityCheckCredential(credentialBundle, mockConfig)).toEqual(undefined);
  });

  it("should return undefined if security check credential is not configured issuer", () => {
    const identityCheck1 = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI", "RiskAssessmentCredential");
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");
    const credentialBundle = [identityCheck1, securityCheck, identityCheck2];

    expect(getSecurityCheckCredential(credentialBundle, mockConfig)).toEqual(undefined);
  });

  it("should return credential with most recent nbf if multiple match", () => {
    const identityCheck1 = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential(
      "securityCRI",
      "SecurityCheckCredential",
      new Date("2026-01-25T15:35:58.000Z")
    );
    const securityCheck2 = createCredential(
      "securityCRI",
      "SecurityCheckCredential",
      new Date("2026-01-26T15:35:58.000Z")
    );
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");

    const credentialBundle = [identityCheck1, securityCheck, securityCheck2, identityCheck2];
    expect(getSecurityCheckCredential(credentialBundle, mockConfig)).toEqual(securityCheck2);

    const credentialBundleDifferentOrder = [identityCheck1, securityCheck2, securityCheck, identityCheck2];
    expect(getSecurityCheckCredential(credentialBundleDifferentOrder, mockConfig)).toEqual(securityCheck2);
  });
});

const createCredential = (
  issuer: string,
  type: VerifiableCredentialType,
  date: Date = new Date("2025-01-25T15:35:58.000Z")
): SecurityCheckCredentialJWTClass => {
  return {
    iss: issuer,
    nbf: date.getTime() / 1000,
    vc: {
      evidence: [{}],
      type: ["VerifiableCredential", type],
    },
  };
};
