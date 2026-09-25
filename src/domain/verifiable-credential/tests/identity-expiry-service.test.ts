import { hasIdentityExpired } from "../identity-expiry-service.js";
import { Configuration } from "../../../commons/configuration.js";
import { VerifiableCredentialJWT } from "../verifiable-credential-types.js";
import { vi, describe, it, expect, beforeEach } from "vitest";

import * as fraudCheckService from "../fraud-check-service.js";
import * as drivingLicenceExpiryService from "../driving-licence-expiry-service.js";
import * as configuration from "../../../commons/configuration.js";
import { getDefaultJwtHeader, sign } from "../../../../shared-test/jwt-utilities.js";

const FRAUD_ISSUER = ["fraudCRI"];
const DCMAW_ISSUER = ["https://www.review-b.dev.account.gov.uk"];

const BASE_CONFIGURATION: Configuration = {
  evcsApiUrl: "https://evcs.gov.uk",
  interventionCodesToInvalidate: [],
  fraudIssuer: FRAUD_ISSUER,
  fraudValidityPeriod: 180,
  controllerAllowList: [],
  dcmawIssuer: DCMAW_ISSUER,
  drivingLicenceValidityPeriod: 180,
};

const getConfiguration = vi.spyOn(configuration, "getConfiguration").mockResolvedValue(BASE_CONFIGURATION);
const hasFraudCheckExpired = vi.spyOn(fraudCheckService, "hasFraudCheckExpired");
const hasDrivingLicenceExpired = vi.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired");

const createMockVc = async (issuer: string): Promise<{ encoded: string; decoded: VerifiableCredentialJWT }> => {
  const decoded: VerifiableCredentialJWT = {
    iss: issuer,
    nbf: Math.floor(Date.now() / 1000),
    sub: "test-user",
    vc: { evidence: [], type: ["VerifiableCredential", "IdentityCheckCredential"] },
  } as unknown as VerifiableCredentialJWT;
  return { encoded: await sign(getDefaultJwtHeader(), decoded), decoded };
};

const { encoded, decoded } = await createMockVc("fraudCRI");

describe("hasIdentityExpired", () => {
  beforeEach(() => {
    hasFraudCheckExpired.mockReset();
    hasDrivingLicenceExpired.mockReset();
  });

  it("should return false when neither fraud nor driving licence has expired", async () => {
    hasFraudCheckExpired.mockReturnValue(false);
    hasDrivingLicenceExpired.mockReturnValue(false);

    const result = await hasIdentityExpired([encoded]);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: decoded });
  });

  it("should return true when fraud check has expired", async () => {
    hasFraudCheckExpired.mockReturnValue(true);
    hasDrivingLicenceExpired.mockReturnValue(false);

    const result = await hasIdentityExpired([encoded]);
    expect(result).toEqual({ fraudExpired: true, drivingLicenceExpired: false, expired: true, fraudVc: decoded });
  });

  it("should return true when driving licence has expired", async () => {
    hasFraudCheckExpired.mockReturnValue(false);
    hasDrivingLicenceExpired.mockReturnValue(true);

    const result = await hasIdentityExpired([encoded]);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: true, expired: true, fraudVc: decoded });
  });

  it("should return true when both fraud and driving licence have expired", async () => {
    hasFraudCheckExpired.mockReturnValue(true);
    hasDrivingLicenceExpired.mockReturnValue(true);

    const result = await hasIdentityExpired([encoded]);
    expect(result).toEqual({ fraudExpired: true, drivingLicenceExpired: true, expired: true, fraudVc: decoded });
  });

  it("should return false when driving licence expiry check returns null", async () => {
    hasFraudCheckExpired.mockReturnValue(false);
    hasDrivingLicenceExpired.mockImplementation(vi.fn());

    const result = await hasIdentityExpired([encoded]);
    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: decoded });
  });

  it("should not check driving licence expiry when dcmawIssuer is undefined", async () => {
    hasFraudCheckExpired.mockReturnValue(false);

    getConfiguration.mockResolvedValueOnce({ ...BASE_CONFIGURATION, dcmawIssuer: undefined });
    const result = await hasIdentityExpired([encoded]);

    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: decoded });
    expect(hasDrivingLicenceExpired).not.toHaveBeenCalled();
  });

  it("should not check driving licence expiry when drivingLicenceValidityPeriod is undefined", async () => {
    hasFraudCheckExpired.mockReturnValue(false);

    getConfiguration.mockResolvedValueOnce({ ...BASE_CONFIGURATION, drivingLicenceValidityPeriod: undefined });
    const result = await hasIdentityExpired([encoded]);

    expect(result).toEqual({ fraudExpired: false, drivingLicenceExpired: false, expired: false, fraudVc: decoded });
    expect(hasDrivingLicenceExpired).not.toHaveBeenCalled();
  });

  it("should pass correct arguments to hasDrivingLicenceExpired", async () => {
    hasFraudCheckExpired.mockReturnValue(false);
    const mockDlCheck = vi.spyOn(drivingLicenceExpiryService, "hasDrivingLicenceExpired").mockReturnValue(false);

    await hasIdentityExpired([encoded]);
    expect(mockDlCheck).toHaveBeenCalledWith([decoded], DCMAW_ISSUER, 180);
  });
});
