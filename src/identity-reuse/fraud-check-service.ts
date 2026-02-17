import logger from "../commons/logger";
import { hasNbfExpired } from "../commons/date-utils";
import { FraudCheckType, IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { VerifiableCredentialJWT, isIdentityCheckCredential } from "./verifiable-credential-jwt";

export const getFraudVc = (
  vcBundle: VerifiableCredentialJWT[],
  fraudIssuers: string[]
): VerifiableCredentialJWT | undefined => {
  return vcBundle
    .filter((vc) => vc.iss !== undefined && fraudIssuers.includes(vc.iss) && vc.nbf !== undefined)
    .sort((vc1, vc2) => vc1.nbf! - vc2.nbf!)
    .pop();
};

export const hasFraudCheckExpired = (
  fraudVc: VerifiableCredentialJWT | undefined,
  fraudValidityPeriod: number
): boolean => {
  if (!fraudVc) {
    logger.info("No fraud check credential found in bundle of verifiable credentials");
    return true;
  }

  if (isIdentityCheckCredential(fraudVc)) {
    if (hasFailedFraudCheck(fraudVc, "available_authoritative_source")) {
      return true;
    }
  }

  const expired = hasNbfExpired(fraudVc.nbf!, fraudValidityPeriod);
  if (expired) {
    logger.info("Fraud check expiry returned expired");
  }
  return expired;
};

const hasFailedFraudCheck = (fraudVc: IdentityCheckCredentialJWTClass, fraudCheckType: FraudCheckType): boolean =>
  fraudVc.vc.evidence.some((evidence) =>
    evidence.failedCheckDetails?.some((failedCheckDetails) => failedCheckDetails.fraudCheck === fraudCheckType)
  );
