import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

export const calculateVot = (
  storedVot: IdentityVectorOfTrust,
  vtr: IdentityVectorOfTrust[]
): IdentityVectorOfTrust | "P0" => {
  const foundVot: IdentityVectorOfTrust | undefined = vtr
    .map((s) => s.trim())
    .sort((a, b) => (a < b ? 1 : -1))
    .find((s): s is IdentityVectorOfTrust => s <= storedVot);

  return foundVot || "P0";
};
