import { describe, expect, it, vi } from "vitest";
import { Configuration } from "../../../configuration/configuration.js";
import { hasIdentityExpired } from "../../verifiable-credential/identity-expiry-service.js";
import { getJwtBody } from "../../../utilities/jwt-utilities.js";
import { calculateVot } from "../../stored-identity/calculate-vot.js";
import { getReuseDecision } from "../reuse-decision.js";

vi.mock("../../../utilities/logger.js");
vi.mock("../../../utilities/jwt-utilities.js");
vi.mock("../../verifiable-credential/identity-expiry-service.js");
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

vi.mocked(getJwtBody).mockReturnValue({ sub: "user-sub", vot: "P2", max_vot: "P2" } as never);

describe("getReuseDecision", () => {
  it("should return isReusable false when both identity is expired and VoT is insufficient", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: { fraudExpired: true, drivingLicenceExpired: true, expired: true, votSufficient: false },
      rawData: { vot: "P0" },
    });
  });

  it("should return isReusable false when only fraud check is expired but VoT is sufficient", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: false,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: { fraudExpired: true, drivingLicenceExpired: false, expired: true, votSufficient: true },
      rawData: { vot: "P2" },
    });
  });

  it("should return isReusable false when only driving licence is expired but VoT is sufficient", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: { fraudExpired: false, drivingLicenceExpired: true, expired: true, votSufficient: true },
      rawData: { vot: "P2" },
    });
  });

  it("should return isReusable false when only VoT is insufficient but identity is not expired", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: false,
      reason: { fraudExpired: false, drivingLicenceExpired: false, expired: false, votSufficient: false },
      rawData: { vot: "P0" },
    });
  });

  it("should return isReusable true when neither check fails", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: false,
      drivingLicenceExpired: false,
      expired: false,
    });
    vi.mocked(calculateVot).mockReturnValue("P2");

    const result = getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(result).toEqual({
      isReusable: true,
      reason: { fraudExpired: false, drivingLicenceExpired: false, expired: false, votSufficient: true },
      rawData: { vot: "P2" },
    });
  });

  it("should always execute both checks before failing", async () => {
    vi.mocked(hasIdentityExpired).mockReturnValue({
      fraudExpired: true,
      drivingLicenceExpired: true,
      expired: true,
    });
    vi.mocked(calculateVot).mockReturnValue("P0");

    getReuseDecision(
      "header.storedidentitybody.signature",
      ["header.vcbody1.signature", "header.vcbody2.signature"],
      "P2",
      ["P2"],
      mockConfig
    );

    expect(hasIdentityExpired).toHaveBeenCalled();
    expect(calculateVot).toHaveBeenCalled();
  });
});
