import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

export type IsSiValidOutput = {
  isValid: true;
  vot: IdentityVectorOfTrust;
} & {
  isValid: false;
  vot: "P0";
};

export const isSiValid = (vot: IdentityVectorOfTrust, vtr: string, isDeleted: boolean = false): IsSiValidOutput => {
  if (isDeleted) {
    return { isValid: false, vot: "P0" } as IsSiValidOutput;
  }

  const foundVot = vtr
    .split(",")
    .map((s) => s.trim())
    .sort((a, b) => (a < b ? 1 : -1))
    .find((s) => s <= vot);

  return {
    isValid: !!foundVot,
    vot: foundVot || "P0",
  } as IsSiValidOutput;
};
