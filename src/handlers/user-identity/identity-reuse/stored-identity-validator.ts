import { StoredIdentityJWT } from "../../../commons/stored-identity-jwt";
import { getJwtSignature } from "../../../commons/jwt-utils";
import logger from "../../../commons/logger";

export const validateStoredIdentityCredentials = (
  storedIdentityRecord: StoredIdentityJWT,
  encodedCredentialJwts: string[]
): boolean => {
  const expectedCredentialSignatures = storedIdentityRecord.credentials;
  if (!expectedCredentialSignatures?.length) {
    logger.error(
      "Failed to validate stored identity record. Stored identity record does not reference any credentials."
    );
    return false;
  }

  const actualCredentialSignatures = encodedCredentialJwts
    .map((jwt) => getJwtSignature(jwt))
    .filter((signature) => {
      if (!signature) {
        logger.warn(
          "Could not identify the signature for a credential. Ignoring it when comparing to the stored identity record"
        );
      }
      return !!signature;
    });

  const validationResult = hasSameElements(expectedCredentialSignatures, actualCredentialSignatures);
  if (!validationResult) {
    logger.error(
      "Failed to validate stored identity record. " +
        "Signatures referenced in the stored identity record do not match the actual credentials returned."
    );
  }
  return validationResult;
};

const hasSameElements = <T>(arr1: T[], arr2: T[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  const set1 = new Set(arr1);
  const set2 = new Set(arr2);
  return set1.size === set2.size && [...set1].every((item) => set2.has(item));
};
