import logger from "../commons/logger";
import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { hasNbfExpired } from "./fraud-check-service";
import { VerifiableCredentialJWT, isIdentityCheckCredential } from "./verifiable-credential-jwt";

export const getDcmawVc = (
  vcBundle: VerifiableCredentialJWT[],
  dcmawIssuers: string[]
): IdentityCheckCredentialJWTClass | undefined => {
  const dcmawVcs = vcBundle.filter((vc): vc is IdentityCheckCredentialJWTClass => {
    const hasValidIssuer = vc.iss !== undefined && dcmawIssuers.includes(vc.iss);
    return hasValidIssuer && isIdentityCheckCredential(vc);
  });

  if (dcmawVcs.length > 1) {
    logger.warn("Multiple DCMAW VCs found in credential bundle, using the first");
  }

  return dcmawVcs.at(0);
};

export const hasDrivingPermit = (vc: IdentityCheckCredentialJWTClass): boolean => {
  const drivingPermits = vc.vc?.credentialSubject?.drivingPermit;
  return Array.isArray(drivingPermits) && drivingPermits.length > 0;
};

const normaliseToStartOfDay = (date: Date): Date => {
  const normalised = new Date(date);
  normalised.setUTCHours(0, 0, 0, 0);
  return normalised;
};

export const wasDrivingLicenceExpiredAtIssuance = (vc: IdentityCheckCredentialJWTClass): boolean => {
  const drivingPermits = vc.vc?.credentialSubject?.drivingPermit;
  if (!drivingPermits || drivingPermits.length === 0) {
    return false;
  }

  if (drivingPermits.length > 1) {
    logger.warn("Multiple driving permits found in DCMAW VC, using the first");
  }

  const [drivingPermit] = drivingPermits;
  if (!drivingPermit.expiryDate || !vc.nbf) {
    logger.warn("Missing expiryDate or nbf in driving permit VC");
    return false;
  }

  const licenceExpiryDay = normaliseToStartOfDay(new Date(drivingPermit.expiryDate));
  const vcIssuanceDay = normaliseToStartOfDay(new Date(vc.nbf * 1000));

  return licenceExpiryDay < vcIssuanceDay;
};

export const hasDrivingLicenceExpired = (
  vcBundle: VerifiableCredentialJWT[],
  dcmawIssuers: string[],
  validityPeriodDays: number
): boolean | null => {
  const dcmawVc = getDcmawVc(vcBundle, dcmawIssuers);
  if (!dcmawVc) {
    return null;
  }

  if (!hasDrivingPermit(dcmawVc)) {
    return null;
  }

  if (!dcmawVc.nbf) {
    logger.warn("DCMAW VC missing nbf");
    return false;
  }

  if (!wasDrivingLicenceExpiredAtIssuance(dcmawVc)) {
    return false;
  }

  return hasNbfExpired(dcmawVc.nbf, validityPeriodDays);
};
