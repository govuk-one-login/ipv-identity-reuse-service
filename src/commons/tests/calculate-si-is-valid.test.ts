import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { isSiValid } from "../calculate-si-is-valid";

describe("calculate-si-is-valid", () => {
  it.each([
    ["P1", "P1", "P2", true],
    ["P2", "P1,P2", "P2", true],
    ["P1", "P1,P2", "P1", true],
    ["P2", "P2", "P3", true],
    ["P2", "P2,P3", "P2", true],
    ["P2", "P2", "P3", true],
    ["P3", "P2,P3", "P3", true],
    ["P2", "P2,P3", "P2", true],
    ["P0", "P3", "P2", false],
  ])(
    "should return %s, for vtr %s, vot %s and isValid is %b",
    (expected: string, vtr: string, vot: string, isValue: boolean) => {
      const { isValid, vot: returnedVot } = isSiValid(vot as unknown as IdentityVectorOfTrust, vtr);

      expect(isValid).toEqual(isValue);
      expect(returnedVot).toEqual(expected);
    }
  );
});
