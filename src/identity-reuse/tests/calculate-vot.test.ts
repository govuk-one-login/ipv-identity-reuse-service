import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { calculateVot } from "../calculate-vot";

describe("calculate-vot", () => {
  it.each<[string, IdentityVectorOfTrust[], string]>([
    ["P1", ["P1"], "P2"],
    ["P2", ["P1", "P2"], "P2"],
    ["P2", ["P2", "P1"], "P2"],
    ["P1", ["P1", "P2"], "P1"],
    ["P2", ["P2"], "P3"],
    ["P2", ["P2", "P3"], "P2"],
    ["P2", ["P3", "P2"], "P2"],
    ["P2", ["P2"], "P3"],
    ["P3", ["P2", "P3"], "P3"],
    ["P3", ["P3", "P2"], "P3"],
    ["P2", ["P2", "P3"], "P2"],
    ["P2", ["P3", "P2"], "P2"],
    ["P0", ["P3"], "P2"],
  ])(
    "should return %s, for vtr %s, stored vot %s",
    (expected: string, vtr: IdentityVectorOfTrust[], storedVot: string) => {
      const returnedVot = calculateVot(storedVot as unknown as IdentityVectorOfTrust, vtr);

      expect(returnedVot).toEqual(expected);
    }
  );
});
