import logger from "./logger";
import { IdentityAssertionCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";

export const hasFraudCheckExpired = (
  fraudIssuer: string,
  vcBundle: IdentityAssertionCredentialJWTClass[],
  validityPeriodHours: number
): boolean => {
  const fraudVc = vcBundle
    .filter((vc) => vc.iss == fraudIssuer && vc.nbf != undefined)
    .sort((vc1, vc2) => {
      return vc1.nbf! - vc2.nbf!;
    })
    .pop();

  if (!fraudVc) {
    logger.info("No fraud check credential found in bundle of verifiable credentials");
    return true;
  }

  return hasNbfExpired(fraudVc.nbf!, validityPeriodHours);
};

const hasNbfExpired = (nbf: number, validityPeriodHours: number): boolean => {
  const expiredTimeMilliSeconds = (nbf + validityPeriodHours * 3600) * 1000;
  return expiredTimeMilliSeconds <= Date.now();
};
