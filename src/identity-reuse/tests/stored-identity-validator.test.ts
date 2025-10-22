import { UserIdentityResponse } from "../../handlers/user-identity/user-identity-response";
import { validateStoredIdentityCredentials } from "../stored-identity-validator";

describe("validateStoredIdentityCredentials", () => {
  it("should return true when signatures in stored identity match credentials", () => {
    const storedIdentityRecord: UserIdentityResponse = createStoredIdentityRecord("ererwefg", "giukgmas");

    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.giukgmas"];
    const encodedCredentialJwtsReversed = ["someheader.somebody.giukgmas", "someheader.somebody.ererwefg"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(true);
    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwtsReversed)).toBe(true);
  });

  it("should return false when signatures in stored identity differ to credentials", () => {
    const storedIdentityRecord: UserIdentityResponse = createStoredIdentityRecord("ererwefg", "giukgmas");
    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.baqlvsff"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has extra signature", () => {
    const storedIdentityRecord: UserIdentityResponse = createStoredIdentityRecord("ererwefg", "baqlvsff", "giukgmas");
    const encodedCredentialJwts = ["someheader.somebody.ererwefg", "someheader.somebody.baqlvsff"];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has missing signature", () => {
    const storedIdentityRecord: UserIdentityResponse = createStoredIdentityRecord("ererwefg", "baqlvsff");
    const encodedCredentialJwts = [
      "someheader.somebody.ererwefg",
      "someheader.somebody.baqlvsff",
      "someheader.somebody.giukgmas",
    ];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });

  it("should return false when stored identity has zero signatures and there are no credentials", () => {
    const storedIdentityRecord: UserIdentityResponse = createStoredIdentityRecord(...[]);
    const encodedCredentialJwts: string[] = [];

    expect(validateStoredIdentityCredentials(storedIdentityRecord, encodedCredentialJwts)).toBe(false);
  });
});

const createStoredIdentityRecord = (...signatures: string[]): UserIdentityResponse => {
  return {
    sub: "userId",
    credentials: signatures,
    vot: "P2",
    vtm: "",
  };
};
