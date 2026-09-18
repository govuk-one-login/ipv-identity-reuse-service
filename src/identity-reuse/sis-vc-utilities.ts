import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { getJwtSignature } from "../commons/jwt-utilities.js";
import logger from "../commons/logger.js";
import { StoredIdentityVectorOfTrust } from "../types/stored-identity-api-types.js";
import { StoredIdentityJWT } from "../types/stored-identity-jwt.js";

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

export const calculateVot = (
  content: StoredIdentityJWT,
  unsignedVot: IdentityVectorOfTrust,
  vtr: IdentityVectorOfTrust[]
): StoredIdentityVectorOfTrust => {
  let vot = content.max_vot;
  if (!vot) {
    logger.warn("Max VOT not in VC. Using unsigned VOT");
    vot = unsignedVot;
  }

  const foundVot: IdentityVectorOfTrust | undefined = vtr
    .map((s) => s.trim())
    // eslint-disable-next-line unicorn/no-array-sort -- toSorted not supported by current configuration
    .sort((a, b) => (a < b ? 1 : -1))
    .find((s): s is IdentityVectorOfTrust => s <= vot);

  return foundVot || "P0";
};

const hasSameElements = <T>(array1: T[], array2: T[]): boolean => {
  if (array1.length !== array2.length) return false;
  const set1 = new Set(array1);
  const set2 = new Set(array2);
  return set1.size === set2.size && [...set1].every((item) => set2.has(item));
};
