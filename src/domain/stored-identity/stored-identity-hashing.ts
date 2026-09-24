import { EVCSIdentityResponse } from "../../api/evcs-api.js";
import { createHash } from "node:crypto";
import { compareStringAscending } from "../../commons/string-utilities.js";

export const createStoredIdentityHash = (identityResponse: EVCSIdentityResponse): string => {
  const hash = createHash("sha256");
  const sortedVcs = identityResponse.vcs.map((vcObject) => vcObject.vc).toSorted(compareStringAscending);

  hash.update(identityResponse.si.vc);
  hash.update(identityResponse.si.unsignedVot);

  for (const vc in sortedVcs) {
    hash.update(vc);
  }

  return hash.digest("hex");
};
