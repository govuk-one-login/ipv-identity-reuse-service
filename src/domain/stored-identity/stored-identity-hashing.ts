import { createHash } from "node:crypto";
import { compareStringAscending } from "../../commons/string-utilities.js";
import { CalculatedVectorOfTrust, SignedStoredIdentity } from "./stored-identity-types.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { StoredIdentityHashMismatchError } from "../../commons/errors.js";

export const createStoredIdentityHash = (
  storedIdentityJwt: string,
  vot: CalculatedVectorOfTrust,
  vcJwts: string[]
): string => {
  const hash = createHash("sha256");
  const sortedJwts = vcJwts.toSorted(compareStringAscending);

  hash.update(storedIdentityJwt);
  hash.update(vot);

  for (const vc in sortedJwts) {
    hash.update(vc);
  }

  return hash.digest("hex");
};

export const validateStoredIdentityAndVotByHash = (
  signedStoredIdentity: SignedStoredIdentity,
  vot: IdentityVectorOfTrust,
  expectedHash: string
): void => {
  const recalculatedIdentityHash = createStoredIdentityHash(
    signedStoredIdentity.signedStoredIdentityRecord,
    vot,
    signedStoredIdentity.signedCredentials
  );

  if (recalculatedIdentityHash !== expectedHash) {
    throw new StoredIdentityHashMismatchError("Recalculated stored identity hash does not match the expected hash");
  }
};
