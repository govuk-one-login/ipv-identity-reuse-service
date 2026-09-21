import { Configuration } from "../../commons/configuration.js";
import { hasDrivingLicenceExpired } from "./driving-licence-expiry-service.js";
import { hasFraudCheckExpired, getFraudVc } from "./fraud-check-service.js";
import { VerifiableCredentialJWT } from "./verifiable-credential-jwt.js";

export type IdentityExpiryResult = {
  fraudExpired: boolean;
  drivingLicenceExpired: boolean;
  expired: boolean;
};

export const hasIdentityExpired = (
  currentVcs: VerifiableCredentialJWT[],
  configuration: Configuration
): IdentityExpiryResult => {
  const fraudVc = getFraudVc(currentVcs, configuration.fraudIssuer);
  const fraudExpired = hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod);

  let drivingLicenceExpired = false;
  if (configuration.dcmawIssuer !== undefined && configuration.drivingLicenceValidityPeriod !== undefined) {
    drivingLicenceExpired =
      hasDrivingLicenceExpired(currentVcs, configuration.dcmawIssuer, configuration.drivingLicenceValidityPeriod) ===
      true;
  }

  return {
    fraudExpired,
    drivingLicenceExpired,
    expired: fraudExpired || drivingLicenceExpired,
  };
};
