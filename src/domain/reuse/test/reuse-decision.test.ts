import { describe, expect, it, vi } from "vitest";
import { Configuration } from "../../../configuration/configuration.js";
import { hasIdentityExpired } from "../../verifiable-credential/identity-expiry-service.js";
import { calculateVot } from "../../stored-identity/calculate-vot.js";
import { getReuseDecision } from "../reuse-decision.js";
import { getSecurityCheckCredential } from "../../verifiable-credential/security-check.js";
import {
  IdentityCheckCredentialJWTClass,
  SecurityCheckCredentialJWTClass,
} from "@govuk-one-login/data-vocab/credentials.js";

vi.mock("../../../utilities/logger.js");
vi.mock("../../../utilities/jwt-utilities.js");
vi.mock("../../verifiable-credential/identity-expiry-service.js");
vi.mock("../../verifiable-credential/security-check.js");
vi.mock("../../stored-identity/calculate-vot.js");

const mockConfig: Configuration = {
  ciReturnCodes: [],
  controllerAllowList: [],
  evcsApiUrl: "https://evcs.account.gov.uk",
  fraudIssuer: ["fraudCRI"],
  fraudValidityPeriod: 180,
  interventionCodesToInvalidate: [],
  securityCheckIssuer: "securityCRI",
  vtm: "https://vtm.account.gov.uk",
};

const mockFraudCheckCredential: IdentityCheckCredentialJWTClass = {
  iss: "fraudCRI",
  nbf: 123,
  sub: "sub",
  vc: { evidence: [{}] },
};
const mockSecurityCheckCredential: SecurityCheckCredentialJWTClass = { vc: { evidence: [{}] } };

describe("getReuseDecision", () => {
  it("should return isReusable false when both identity is expired and VoT is insufficient", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toStrictEqual({
      isReusable: false,
      reason: {
        fraudExpired: true,
        drivingLicenceExpired: true,
        expired: true,
        securityCheckPresent: true,
        votSufficient: false,
      },
      rawData: { vot: "P0", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should return isReusable false when only fraud check is expired but VoT is sufficient", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: false,
      expired: true,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: {
        fraudExpired: true,
        drivingLicenceExpired: false,
        expired: true,
        securityCheckPresent: true,
        votSufficient: true,
      },
      rawData: { vot: "P2", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should return isReusable false when only driving licence is expired but VoT is sufficient", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: true,
      expired: true,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: {
        fraudExpired: false,
        drivingLicenceExpired: true,
        expired: true,
        securityCheckPresent: true,
        votSufficient: true,
      },
      rawData: { vot: "P2", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should return isReusable false when only VoT is insufficient but identity is not expired", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: {
        fraudExpired: false,
        drivingLicenceExpired: false,
        expired: false,
        securityCheckPresent: true,
        votSufficient: false,
      },
      rawData: { vot: "P0", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should return isReusable false when no security check credential present", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");
    // eslint-disable-next-line unicorn/no-useless-undefined
    vi.mocked(getSecurityCheckCredential).mockReturnValue(undefined);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: {
        fraudExpired: false,
        drivingLicenceExpired: false,
        expired: false,
        securityCheckPresent: false,
        votSufficient: true,
      },
      rawData: { vot: "P2", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should return isReusable true when neither check fails", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: true,
      reason: {
        fraudExpired: false,
        drivingLicenceExpired: false,
        expired: false,
        securityCheckPresent: true,
        votSufficient: true,
      },
      rawData: { vot: "P2", fraudVc: mockFraudCheckCredential },
    });
  });

  it("should always execute both checks before failing", () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
      fraudVc: mockFraudCheckCredential,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");
    vi.mocked(getSecurityCheckCredential).mockReturnValue(mockSecurityCheckCredential);

    getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(hasIdentityExpired).toHaveBeenCalled();
    expect(calculateVot).toHaveBeenCalled();
    expect(getSecurityCheckCredential).toHaveBeenCalled();
  });
});
