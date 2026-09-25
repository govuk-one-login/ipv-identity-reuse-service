import { getConfiguration } from "../../commons/configuration.js";
import { hasDrivingLicenceExpired } from "./driving-licence-expiry-service.js";
import { hasFraudCheckExpired, getFraudVc } from "./fraud-check-service.js";
import { VerifiableCredentialJWT } from "./verifiable-credential-types.js";
import { getJwtBody } from "../../commons/jwt-utilities.js";

export type IdentityExpiryResult = {
  fraudExpired: boolean;
  drivingLicenceExpired: boolean;
  expired: boolean;
  fraudVc?: VerifiableCredentialJWT;
};

export const hasIdentityExpired = async (storedIdentityVcJwts: string[]): Promise<IdentityExpiryResult> => {
  const configuration = await getConfiguration();

  const vcs = parseVerifiableCredentials(storedIdentityVcJwts);
  const fraudVc = getFraudVc(vcs, configuration.fraudIssuer);
  const fraudExpired = hasFraudCheckExpired(fraudVc, configuration.fraudValidityPeriod);

  let drivingLicenceExpired = false;
  if (configuration.dcmawIssuer !== undefined && configuration.drivingLicenceValidityPeriod !== undefined) {
    drivingLicenceExpired =
      hasDrivingLicenceExpired(vcs, configuration.dcmawIssuer, configuration.drivingLicenceValidityPeriod) === true;
  }

  return {
    fraudExpired,
    drivingLicenceExpired,
    expired: fraudExpired || drivingLicenceExpired,
    fraudVc,
  };
};

const parseVerifiableCredentials = (vcJwts: string[]): VerifiableCredentialJWT[] => {
  return vcJwts.map((vcJwt) => getJwtBody<VerifiableCredentialJWT>(vcJwt));
};
