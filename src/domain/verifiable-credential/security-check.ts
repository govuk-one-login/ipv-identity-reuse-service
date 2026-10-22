import { isSecurityCheckCredential, VerifiableCredentialJWT } from "./verifiable-credential-types.js";
import { Configuration } from "../../configuration/configuration.js";
import { SecurityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials.js";

export const getSecurityCheckCredential = (
  credentialBundle: VerifiableCredentialJWT[],
  configuration: Configuration
): SecurityCheckCredentialJWTClass | undefined => {
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
