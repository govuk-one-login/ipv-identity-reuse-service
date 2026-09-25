import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { StoredIdentityRecord, StoredIdentityVectorOfTrust } from "./stored-identity-types.js";
import logger from "../../commons/logger.js";
import { compareStringDescending } from "../../commons/string-utilities.js";

export const calculateVot = (
  content: StoredIdentityRecord,
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
    .toSorted(compareStringDescending)
    .find((s): s is IdentityVectorOfTrust => s <= vot);

  return foundVot || "P0";
};
