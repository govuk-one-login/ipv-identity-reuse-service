import { createHash } from "node:crypto";
import { compareStringAscending } from "../../commons/string-utilities.js";
import { StoredIdentityVectorOfTrust } from "./stored-identity-types.js";

export const createStoredIdentityHash = (
  storedIdentityJwt: string,
  vot: StoredIdentityVectorOfTrust,
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
