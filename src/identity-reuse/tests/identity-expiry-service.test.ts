import { hasIdentityExpired } from "../identity-expiry-service";
import { Configuration } from "../../commons/configuration";
import * as fraudCheckService from "../fraud-check-service";
import * as drivingLicenceExpiryService from "../driving-licence-expiry-service";
import { VerifiableCredentialJWT } from "../verifiable-credential-jwt";

jest.mock("../../commons/logger");

const FRAUD_ISSUER = ["fraudCRI"];
const DCMAW_ISSUER = ["https://www.review-b.dev.account.gov.uk"];

const BASE_CONFIGURATION: Configuration = {
  evcsApiUrl: "https://evcs.gov.uk",
  interventionCodesToInvalidate: [],
  fraudIssuer: FRAUD_ISSUER,
  fraudValidityPeriod: 180,
  controllerAllowList: [],
  enableDrivingLicenceExpiryCheck: true,
  dcmawIssuer: DCMAW_ISSUER,
  drivingLicenceValidityPeriod: 180,
};

const createMockVc = (issuer: string): VerifiableCredentialJWT =>
  ({
    iss: issuer,
    nbf: Math.floor(Date.now() / 1000),
    sub: "test-user",
    vc: { evidence: [], type: ["VerifiableCredential", "IdentityCheckCredential"] },
  }) as unknown as VerifiableCredentialJWT;

describe("identity-expiry-service", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("should return false when neither fraud nor driving licence has expired", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(false);

    const result = hasIdentityExpired([createMockVc("fraudCRI")], BASE_CONFIGURATION);
    expect(result).toBe(false);
  });

  it("should return true when fraud check has expired", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(true);
    jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(false);

    const result = hasIdentityExpired([createMockVc("fraudCRI")], BASE_CONFIGURATION);
    expect(result).toBe(true);
  });

  it("should return true when driving licence has expired", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(true);

    const result = hasIdentityExpired([createMockVc("fraudCRI")], BASE_CONFIGURATION);
    expect(result).toBe(true);
  });

  it("should return true when both fraud and driving licence have expired", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(true);
    jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(true);

    const result = hasIdentityExpired([createMockVc("fraudCRI")], BASE_CONFIGURATION);
    expect(result).toBe(true);
  });

  it("should return false when driving licence expiry check returns null", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(null);

    const result = hasIdentityExpired([createMockVc("fraudCRI")], BASE_CONFIGURATION);
    expect(result).toBe(false);
  });

  it("should not check driving licence expiry when feature flag is disabled", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    const mockDlCheck = jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired");

    const configuration = { ...BASE_CONFIGURATION, enableDrivingLicenceExpiryCheck: false };
    const result = hasIdentityExpired([createMockVc("fraudCRI")], configuration);

    expect(result).toBe(false);
    expect(mockDlCheck).not.toHaveBeenCalled();
  });

  it("should not check driving licence expiry when dcmawIssuer is undefined", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    const mockDlCheck = jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired");

    const configuration = { ...BASE_CONFIGURATION, dcmawIssuer: undefined };
    const result = hasIdentityExpired([createMockVc("fraudCRI")], configuration);

    expect(result).toBe(false);
    expect(mockDlCheck).not.toHaveBeenCalled();
  });

  it("should not check driving licence expiry when drivingLicenceValidityPeriod is undefined", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    const mockDlCheck = jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired");

    const configuration = { ...BASE_CONFIGURATION, drivingLicenceValidityPeriod: undefined };
    const result = hasIdentityExpired([createMockVc("fraudCRI")], configuration);

    expect(result).toBe(false);
    expect(mockDlCheck).not.toHaveBeenCalled();
  });

  it("should pass correct arguments to hasDrivingLicenceExpired", () => {
    jest.spyOn(fraudCheckService, "hasFraudCheckExpired").mockReturnValue(false);
    const mockDlCheck = jest.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(false);

    const vcs = [createMockVc("fraudCRI")];
    hasIdentityExpired(vcs, BASE_CONFIGURATION);

    expect(mockDlCheck).toHaveBeenCalledWith(vcs, DCMAW_ISSUER, 180);
  });
});
