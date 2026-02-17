import { Configuration } from "../commons/configuration";
import { hasDrivingLicenceExpired } from "./driving-licence-expiry-service";
import { hasFraudCheckExpired, getFraudVc } from "./fraud-check-service";
import { VerifiableCredentialJWT } from "./verifiable-credential-jwt";

export const hasIdentityExpired = (currentVcs: VerifiableCredentialJWT[], configuration: Configuration): boolean => {
  const fraudVc = getFraudVc(currentVcs, configuration.fraudIssuer);
  const fraudExpired = hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod);

  let drivingLicenceExpired: boolean | null = null;
  if (
    configuration.enableDrivingLicenceExpiryCheck &&
    configuration.dcmawIssuer !== undefined &&
    configuration.drivingLicenceValidityPeriod !== undefined
  ) {
    drivingLicenceExpired = hasDrivingLicenceExpired(
      currentVcs,
      configuration.dcmawIssuer,
      configuration.drivingLicenceValidityPeriod
    );
  }

  return fraudExpired || drivingLicenceExpired === true;
};
