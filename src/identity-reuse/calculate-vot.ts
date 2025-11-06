import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { StoredIdentityJWT } from "../handlers/user-identity/stored-identity-jwt";
import logger from "../commons/logger";
import { StoredIdentityVectorOfTrust } from "../handlers/user-identity/user-identity-response";

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
    .sort((a, b) => (a < b ? 1 : -1))
    .find((s): s is IdentityVectorOfTrust => s <= vot);

  return foundVot || "P0";
};
