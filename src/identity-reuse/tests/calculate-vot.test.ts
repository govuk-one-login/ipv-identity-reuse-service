import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { calculateVot } from "../calculate-vot";
import { StoredIdentityVectorOfTrust } from "../../handlers/user-identity/user-identity-response";
import { StoredIdentityJWT } from "../../handlers/user-identity/stored-identity-jwt";
import logger from "../../commons/logger";

jest.mock("../../commons/logger");

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
    jest.mock("../../commons/logger");

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
