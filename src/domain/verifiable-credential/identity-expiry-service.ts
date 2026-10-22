import type { Configuration } from "../../configuration/configuration.js";
import { hasDrivingLicenceExpired } from "./driving-licence-expiry-service.js";
import { hasFraudCheckExpired, getFraudVc } from "./fraud-check-service.js";
import { VerifiableCredentialJWT } from "./verifiable-credential-types.js";

export type IdentityExpiryResult = {
  fraudExpired: boolean;
  drivingLicenceExpired: boolean;
  expired: boolean;
  fraudVc?: VerifiableCredentialJWT;
};

export const hasIdentityExpired = (
  credentialBundle: VerifiableCredentialJWT[],
  configuration: Configuration
): IdentityExpiryResult => {
  const fraudVc = getFraudVc(credentialBundle, configuration.fraudIssuer);
  const fraudExpired = hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod);

  let drivingLicenceExpired = false;
  if (configuration.dcmawIssuer !== undefined && configuration.drivingLicenceValidityPeriod !== undefined) {
    drivingLicenceExpired =
      hasDrivingLicenceExpired(
        credentialBundle,
        configuration.dcmawIssuer,
        configuration.drivingLicenceValidityPeriod
      ) === true;
  }

  return {
    fraudExpired,
    drivingLicenceExpired,
    expired: fraudExpired || drivingLicenceExpired,
    fraudVc,
  };
};
