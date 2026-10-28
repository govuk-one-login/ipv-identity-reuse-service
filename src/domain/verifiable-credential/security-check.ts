import { isSecurityCheckCredential, ReturnCode, VerifiableCredentialJWT } from "./verifiable-credential-types.js";
import { Configuration, ReturnCodeMapping } from "../../configuration/configuration.js";
import { SecurityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials.js";
import logger from "../../utilities/logger.js";

export const getSecurityCheckCredential = (
  credentialBundle: VerifiableCredentialJWT[],
  configuration: Configuration
): SecurityCheckCredentialJWTClass | undefined => {
  logger.info("getSecurityCheckCredential", { credentialBundle, configuration });
  return (
    credentialBundle
      .filter(
        (vc): vc is SecurityCheckCredentialJWTClass =>
          vc.iss !== undefined &&
          vc.nbf !== undefined &&
          configuration.securityCheckIssuer === vc.iss &&
          isSecurityCheckCredential(vc)
      )
      // eslint-disable-next-line unicorn/no-array-sort -- toSorted not supported by current configuration
      .sort((vc1, vc2) => vc1.nbf! - vc2.nbf!)
      .pop()
  );
};

export const getReturnCodes = (
  credentialBundle: VerifiableCredentialJWT[],
  configuration: Configuration
): ReturnCode[] => {
  const securityCheckCredential: SecurityCheckCredentialJWTClass | undefined = getSecurityCheckCredential(
    credentialBundle,
    configuration
  );

  const returnCodeMappings: ReturnCodeMapping[] = configuration.ciReturnCodes;

  if (!securityCheckCredential || returnCodeMappings.length === 0) {
    logger.warn("No security check credential or return code mappings available to calculate return codes");
    return [];
  }

  return mapCredentialToReturnCodes(securityCheckCredential, configuration.ciReturnCodes);
};

const mapCredentialToReturnCodes = (
  securityCheckCredential: SecurityCheckCredentialJWTClass,
  returnCodeMappings: ReturnCodeMapping[]
): ReturnCode[] => {
  const contraIndicatorCodes: string[] = securityCheckCredential.vc.evidence.flatMap((evidence) =>
    evidence.contraIndicator ? evidence.contraIndicator.flatMap((ci) => ci.code ?? []) : []
  );
  const uniqueContraIndicatorCodes: string[] = [...new Set(contraIndicatorCodes)];

  const returnCodes: ReturnCode[] = [];
  for (const ciCode of uniqueContraIndicatorCodes) {
    const mapping: ReturnCodeMapping | undefined = returnCodeMappings.findLast((mapping) => mapping.ci === ciCode);
    if (mapping && !returnCodes.some((returnCode) => returnCode.code === mapping.returnCode)) {
      returnCodes.push({ code: mapping.returnCode });
    }
  }

  return returnCodes;
};
