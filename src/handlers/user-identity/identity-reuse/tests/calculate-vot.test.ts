import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { calculateVot } from "../calculate-vot";
import logger from "../../../../commons/logger";
import { StoredIdentityVectorOfTrust } from "../../user-identity-handler";
import { StoredIdentityJWT } from "../../../../commons/stored-identity-jwt";

jest.mock("../../../../commons/logger");

const mockedLogger = logger as jest.Mocked<typeof logger>;

describe("calculate-vot", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each<[StoredIdentityVectorOfTrust, IdentityVectorOfTrust[], IdentityVectorOfTrust]>([
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
  ])("should return %s, for vtr %s and unsigned vot %s when max_vot not present", (expected, vtr, unsignedVot) => {
    const jwt: StoredIdentityJWT = {} as StoredIdentityJWT;
    const returnedVot = calculateVot(jwt, unsignedVot, vtr);

    expect(mockedLogger.warn).toHaveBeenCalledWith("Max VOT not in VC. Using unsigned VOT");

    expect(returnedVot).toEqual(expected);
  });

  it.each<[StoredIdentityVectorOfTrust, IdentityVectorOfTrust[], IdentityVectorOfTrust, IdentityVectorOfTrust]>([
    ["P1", ["P1"], "P2", "P3"],
    ["P2", ["P1", "P2"], "P2", "P3"],
    ["P2", ["P2", "P1"], "P2", "P3"],
    ["P1", ["P1", "P2"], "P1", "P3"],
    ["P2", ["P2"], "P3", "P2"],
    ["P2", ["P2", "P3"], "P2", "P2"],
    ["P2", ["P3", "P2"], "P2", "P2"],
    ["P2", ["P2"], "P3", "P4"],
    ["P3", ["P2", "P3"], "P3", "P2"],
    ["P3", ["P3", "P2"], "P3", "P2"],
    ["P2", ["P2", "P3"], "P2", "P2"],
    ["P2", ["P3", "P2"], "P2", "P2"],
    ["P0", ["P3"], "P2", "P2"],
  ])(
    "should return %s, for vtr %s and unsigned vot %s when max_vot is present",
    (expected, vtr, signedVot, unsignedVot) => {
      const jwt: StoredIdentityJWT = {
        max_vot: signedVot,
      } as StoredIdentityJWT;

      const returnedVot = calculateVot(jwt, unsignedVot, vtr);
      expect(returnedVot).toEqual(expected);
    }
  );
});
