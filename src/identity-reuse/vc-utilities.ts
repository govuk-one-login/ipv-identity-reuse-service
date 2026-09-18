import { Configuration } from "../commons/configuration.js";
import { hasDrivingLicenceExpired } from "./driving-permit-vc-utilities.js";
import { hasFraudCheckExpired, getFraudVc } from "./fraud-vc-utilities.js";
import { VerifiableCredentialJWT } from "../types/verifiable-credential-jwt.js";

export const hasIdentityExpired = (currentVcs: VerifiableCredentialJWT[], configuration: Configuration): boolean => {
  const fraudVc = getFraudVc(currentVcs, configuration.fraudIssuer);
  const fraudExpired = hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod);

  let drivingLicenceExpired: boolean | undefined = undefined;
  if (configuration.dcmawIssuer !== undefined && configuration.drivingLicenceValidityPeriod !== undefined) {
    drivingLicenceExpired = hasDrivingLicenceExpired(
      currentVcs,
      configuration.dcmawIssuer,
      configuration.drivingLicenceValidityPeriod
    );
  }

  return fraudExpired || drivingLicenceExpired === true;
};
