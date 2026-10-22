import { hasIdentityExpired } from "../identity-expiry-service.js";
import type { Configuration } from "../../../configuration/configuration.js";
import { hasFraudCheckExpired } from "../fraud-check-service.js";
import { hasDrivingLicenceExpired } from "../driving-licence-expiry-service.js";
import { VerifiableCredentialJWT } from "../verifiable-credential-types.js";
import { vi, describe, it, expect, beforeEach } from "vitest";

const FRAUD_ISSUER = ["fraudCRI"];
const DCMAW_ISSUER = ["https://www.review-b.dev.account.gov.uk"];

vi.mock("../../../configuration/configuration.js");
vi.mock("../driving-licence-expiry-service.js");
vi.mock("../fraud-check-service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../fraud-check-service.js")>();
  return {
    ...actual,
    hasFraudCheckExpired: vi.fn(),
  };
});

const BASE_CONFIGURATION: Configuration = {
  evcsApiUrl: "https://evcs.gov.uk",
  interventionCodesToInvalidate: [],
  fraudIssuer: FRAUD_ISSUER,
  fraudValidityPeriod: 180,
  controllerAllowList: [],
  dcmawIssuer: DCMAW_ISSUER,
  drivingLicenceValidityPeriod: 180,
  securityCheckIssuer: "https://cimit.example.com",
  ciReturnCodes: [{ ci: "G97", returnCode: "L" }],
  vtm: "https://oidc.account.gov.uk/trustmark",
};

const createMockVc = async (issuer: string): Promise<VerifiableCredentialJWT> => {
  return {
    iss: issuer,
    nbf: Math.floor(Date.now() / 1000),
    sub: "test-user",
    vc: { evidence: [], type: ["VerifiableCredential", "IdentityCheckCredential"] },
  } as unknown as VerifiableCredentialJWT;
};

const mockVc = await createMockVc("fraudCRI");

describe("hasIdentityExpired", () => {
  beforeEach(() => {
    vi.mocked(hasFraudCheckExpired).mockReset();
    vi.mocked(hasDrivingLicenceExpired).mockReset();
  });

  it("should return false when neither fraud nor driving licence has expired", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);
    vi.mocked(hasDrivingLicenceExpired).mockReturnValue(false);

    const result = hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: mockVc });
  });

  it("should return true when fraud check has expired", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(true);
    vi.mocked(hasDrivingLicenceExpired).mockReturnValue(false);

    const result = hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(result).toEqual({ fraudExpired: true, drivingLicenceExpired: false, expired: true, fraudVc: mockVc });
  });

  it("should return true when driving licence has expired", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);
    vi.mocked(hasDrivingLicenceExpired).mockReturnValue(true);

    const result = hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: true, expired: true, fraudVc: mockVc });
  });

  it("should return true when both fraud and driving licence have expired", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(true);
    vi.mocked(hasDrivingLicenceExpired).mockReturnValue(true);

    const result = hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(result).toEqual({ fraudExpired: true, drivingLicenceExpired: true, expired: true, fraudVc: mockVc });
  });

  it("should return false when driving licence expiry check returns null", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);
    vi.mocked(hasDrivingLicenceExpired).mockImplementation(vi.fn());

    const result = hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: mockVc });
  });

  it("should not check driving licence expiry when dcmawIssuer is undefined", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);

    const result = hasIdentityExpired([mockVc], { ...BASE_CONFIGURATION, dcmawIssuer: undefined });

    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: mockVc });
    expect(hasDrivingLicenceExpired).not.toHaveBeenCalled();
  });

  it("should not check driving licence expiry when drivingLicenceValidityPeriod is undefined", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);

    const result = hasIdentityExpired([mockVc], {
      ...BASE_CONFIGURATION,
      drivingLicenceValidityPeriod: undefined,
    });

    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: mockVc });
    expect(hasDrivingLicenceExpired).not.toHaveBeenCalled();
  });

  it("should pass correct arguments to hasDrivingLicenceExpired", async () => {
    vi.mocked(hasFraudCheckExpired).mockReturnValue(false);
    vi.mocked(hasDrivingLicenceExpired).mockReturnValue(false);

    hasIdentityExpired([mockVc], BASE_CONFIGURATION);
    expect(hasDrivingLicenceExpired).toHaveBeenCalledWith([mockVc], DCMAW_ISSUER, 180);
  });
});
