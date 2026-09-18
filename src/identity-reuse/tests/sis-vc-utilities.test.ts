import { describe, expect, it, vi } from "vitest";
import { StoredIdentityJWT } from "../../types/stored-identity-jwt.js";
import { validateStoredIdentityCredentials, calculateVot } from "../sis-vc-utilities.js";

import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { afterEach, Mocked } from "vitest";
import logger from "../../commons/logger.js";
import { StoredIdentityVectorOfTrust } from "../../handlers/post-phase2-user-identity-handler/post-phase2-user-identity-response.js";

vi.mock("../../commons/logger");

const mockedLogger = logger as Mocked<typeof logger>;

describe("validateStoredIdentityCredentials", () => {
  it("should return true when signatures in stored identity match credentials", () => {
    const storedIdentityRecord: StoredIdentityJWT = createStoredIdentityRecord("ererwefg", "giukgmas");

    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.giukgmas"];
    const encodedCredentialJwtsReversed = ["someheader.somebody.giukgmas", "someheader.somebody.ererwefg"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(true);
    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwtsReversed)).toBe(true);
  });

  it("should return false when signatures in stored identity differ to credentials", () => {
    const storedIdentityRecord: StoredIdentityJWT = createStoredIdentityRecord("ererwefg", "giukgmas");
    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.baqlvsff"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has extra signature", () => {
    const storedIdentityRecord: StoredIdentityJWT = createStoredIdentityRecord("ererwefg", "baqlvsff", "giukgmas");
    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.baqlvsff"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has missing signature", () => {
    const storedIdentityRecord: StoredIdentityJWT = createStoredIdentityRecord("ererwefg", "baqlvsff");
    const encodedCredentialJwts = [
      "someheader.somebody.ererwefg",
      "someheader.somebody.baqlvsff",
      "someheader.somebody.giukgmas",
    ];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has zero signatures and there are no credentials", () => {
    const storedIdentityRecord: StoredIdentityJWT = createStoredIdentityRecord();
    const encodedCredentialJwts: string[] = [];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });
});

describe("calculate-vot", () => {
  afterEach(() => {
    vi.clearAllMocks();
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

const createStoredIdentityRecord = (...signatures: string[]): StoredIdentityJWT => {
  return {
    sub: "userId",
    credentials: signatures,
    vot: "P2",
    vtm: "",
    claims: {
      "https://vocab.account.gov.uk/v1/coreIdentity": {},
      "https://vocab.account.gov.uk/v1/address": [],
    },
  };
};

