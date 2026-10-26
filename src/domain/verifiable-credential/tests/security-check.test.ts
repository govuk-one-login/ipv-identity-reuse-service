import { describe, expect, it, vi } from "vitest";
import { SecurityCheckCredentialJWTClass, VerifiableCredentialType } from "@govuk-one-login/data-vocab/credentials.js";
import { Configuration } from "../../../configuration/configuration.js";
import { getReturnCodes, getSecurityCheckCredential } from "../security-check.js";

vi.mock("../../../utilities/logger.js");

const mockConfig: Configuration = {
  ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
  controllerAllowList: [],
  evcsApiUrl: "",
  fraudIssuer: ["fraudCRI"],
  fraudValidityPeriod: 180,
  interventionCodesToInvalidate: [],
  securityCheckIssuer: "securityCRI",
  vtm: "https://vtm.example.com",
};

describe("getSecurityCheckCredential", () => {
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
      [],
      new Date("2026-01-25T15:35:58.000Z")
    );
    const securityCheck2 = createCredential(
      "securityCRI",
      "SecurityCheckCredential",
      [],
      new Date("2026-01-26T15:35:58.000Z")
    );
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");

    const credentialBundle = [identityCheck1, securityCheck, securityCheck2, identityCheck2];
    expect(getSecurityCheckCredential(credentialBundle, mockConfig)).toEqual(securityCheck2);

    const credentialBundleDifferentOrder = [identityCheck1, securityCheck2, securityCheck, identityCheck2];
    expect(getSecurityCheckCredential(credentialBundleDifferentOrder, mockConfig)).toEqual(securityCheck2);
  });
});

describe("getReturnCodes", () => {
  it("should return empty array if no security check present in bundle", () => {
    const identityCheck1 = createCredential("appCRI", "IdentityCheckCredential");
    const identityCheck2 = createCredential("fraudCRI", "IdentityCheckCredential");
    const credentialBundle = [identityCheck1, identityCheck2];

    expect(getReturnCodes(credentialBundle, mockConfig)).toEqual([]);
  });

  it("should return empty array if no return code mappings present", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI", "SecurityCheckCredential");
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [],
    };

    expect(getReturnCodes(credentialBundle, config)).toEqual([]);
  });

  it("should return return code if mapping present for contra-indicator", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI", "SecurityCheckCredential", ["G97"]);
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
    };

    expect(getReturnCodes(credentialBundle, config)).toEqual([{ code: "L" }]);
  });

  it("should not add return code if no mapping present for contra-indicator", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck = createCredential("securityCRI", "SecurityCheckCredential", ["H97"]);
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
    };

    expect(getReturnCodes(credentialBundle, config)).toEqual([]);
  });

  it("should not duplicate return codes for duplicate contra-indicators", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck: SecurityCheckCredentialJWTClass = {
      iss: "securityCRI",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [
          {
            contraIndicator: [{ code: "G97" }, { code: "G97" }],
          },
          {
            contraIndicator: [{ code: "G97" }],
          },
        ],
        type: ["VerifiableCredential", "SecurityCheckCredential"],
      },
    };
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
    };

    expect(getReturnCodes(credentialBundle, config)).toEqual([{ code: "L" }]);
  });

  it("should return multiple return codes", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck: SecurityCheckCredentialJWTClass = {
      iss: "securityCRI",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [{ contraIndicator: [{ code: "H97" }, { code: "G97" }] }],
        type: ["VerifiableCredential", "SecurityCheckCredential"],
      },
    };
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [
        { ci: "G97", returnCode: "L" },
        { ci: "H97", returnCode: "D" },
      ],
    };

    const returnCodes = getReturnCodes(credentialBundle, config);
    expect(returnCodes.length).toEqual(2);
    expect(returnCodes).toContainEqual({ code: "L" });
    expect(returnCodes).toContainEqual({ code: "D" });
  });

  it("should return multiple return codes from different evidence", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck: SecurityCheckCredentialJWTClass = {
      iss: "securityCRI",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [
          {
            contraIndicator: [{ code: "H97" }],
          },
          {
            contraIndicator: [{ code: "G97" }],
          },
        ],
        type: ["VerifiableCredential", "SecurityCheckCredential"],
      },
    };
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [
        { ci: "G97", returnCode: "L" },
        { ci: "H97", returnCode: "D" },
      ],
    };

    const returnCodes = getReturnCodes(credentialBundle, config);
    expect(returnCodes.length).toEqual(2);
    expect(returnCodes).toContainEqual({ code: "L" });
    expect(returnCodes).toContainEqual({ code: "D" });
  });

  it("should not duplicate same return code from different mappings", () => {
    const identityCheck = createCredential("appCRI", "IdentityCheckCredential");
    const securityCheck: SecurityCheckCredentialJWTClass = {
      iss: "securityCRI",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [{ contraIndicator: [{ code: "H97" }, { code: "G97" }] }],
        type: ["VerifiableCredential", "SecurityCheckCredential"],
      },
    };
    const credentialBundle = [securityCheck, identityCheck];

    const config = {
      ...mockConfig,
      ciReturnCodes: [
        { ci: "G97", returnCode: "L" },
        { ci: "H97", returnCode: "L" },
      ],
    };

    expect(getReturnCodes(credentialBundle, config)).toEqual([{ code: "L" }]);
  });
});

const createCredential = (
  issuer: string,
  type: VerifiableCredentialType,
  contraIndicatorCodes: string[] = [],
  date: Date = new Date("2025-01-25T15:35:58.000Z")
): SecurityCheckCredentialJWTClass => {
  return {
    iss: issuer,
    nbf: Math.floor(date.getTime() / 1000),
    vc: {
      evidence: [
        {
          contraIndicator: contraIndicatorCodes.map((code) => {
            return { code };
          }),
        },
      ],
      type: ["VerifiableCredential", type],
    },
  };
};
