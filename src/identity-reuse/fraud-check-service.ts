import logger from "../commons/logger";
import { FraudCheckType, IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { VerifiableCredentialJWT } from "./verifiable-credential-jwt";
import { Configuration, getConfiguration } from "../commons/configuration";

export const hasFraudCheckExpired = async (vcBundle: VerifiableCredentialJWT[]): Promise<boolean> => {
  const config: Configuration = await getConfiguration();
  const fraudIssuers: string[] = config.fraudIssuer;
  const fraudValidityPeriod: number = config.fraudValidityPeriod;

  const fraudVc = vcBundle
    .filter((vc) => vc.iss !== undefined && fraudIssuers.includes(vc.iss) && vc.nbf !== undefined)
    .sort((vc1, vc2) => {
      return vc1.nbf! - vc2.nbf!;
    })
    .pop();

  if (!fraudVc) {
    logger.info("No fraud check credential found in bundle of verifiable credentials");
    return true;
  }

  if (instanceOfIdentityCheckCredential(fraudVc)) {
    if (checkForFailedFraudCheck(fraudVc, "applicable_authoritative_source")) {
      return false;
    } else if (checkForFailedFraudCheck(fraudVc, "available_authoritative_source")) {
      return true;
    }
  }

  return hasNbfExpired(fraudVc.nbf!, fraudValidityPeriod);
};

const hasNbfExpired = (nbf: number, validityPeriodHours: number): boolean => {
  const expiredTimeMilliSeconds = (nbf + validityPeriodHours * 3600) * 1000;
  return expiredTimeMilliSeconds <= Date.now();
};

const instanceOfIdentityCheckCredential = (
  object: VerifiableCredentialJWT
): object is IdentityCheckCredentialJWTClass => {
  return !!object.vc.type?.includes("IdentityCheckCredential");
};

const checkForFailedFraudCheck = (
  fraudVc: IdentityCheckCredentialJWTClass,
  fraudCheckType: FraudCheckType
): boolean => {
  return fraudVc.vc.evidence.some((evidence) =>
    evidence.failedCheckDetails?.some((failedCheckDetails) => failedCheckDetails.fraudCheck === fraudCheckType)
  );
};
