import { hasFraudCheckExpired } from "../fraudCheckService";
import { IdentityAssertionCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";

describe("hasFraudCheckExpired", () => {
  it.each([
    [false, "2025-02-25T15:35:58.000Z", 4320, "2025-08-23T15:35:58.000Z"],
    [true, "2025-02-25T15:35:58.000Z", 4320, "2025-08-25T15:35:58.000Z"],
    [false, "2025-02-25T15:35:58.000Z", 4320, "2025-08-24T15:35:57.000Z"],
    [true, "2025-02-25T15:35:58.000Z", 4320, "2025-08-24T15:35:59.000Z"],
    [false, "2025-02-25T15:35:58.000Z", 4320, "2025-08-24T15:35:59.000+01:00"],
  ])(
    "should return %s with fraud check nbf of %s, validity period of %s, and current dateTime of %s",
    (expiryResult: boolean, fraudNbfDate: string, validityPeriodHours: number, mockSystemDate: string) => {
      const vcBundle = [createFraudVC(fraudNbfDate), createVC("2025-07-25T15:35:58.000Z", "passportCRI")];

      fakeSystemTime(new Date(mockSystemDate));
      const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, validityPeriodHours);
      expect(fraudCheckExpired).toEqual(expiryResult);
    }
  );

  it("should return true if no fraud VC exists in bundle", () => {
    const vcBundle = [createVC("2025-08-25T15:35:58.000Z", "passportCRI")];
    fakeSystemTime(new Date("2025-09-10T15:35:58.000Z"));
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(true);
  });

  it("should use fraud credential with latest nbf if multiple exist in a bundle", () => {
    const vcBundle = [createFraudVC("2025-01-25T15:35:58.000Z"), createFraudVC("2025-07-26T15:35:58.000Z")];
    fakeSystemTime(new Date("2025-08-24T15:35:58.000Z"));
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(false);

    const fraudCheckExpiredReversed = hasFraudCheckExpired("fraudCRI", vcBundle.reverse(), 4320);
    expect(fraudCheckExpiredReversed).toEqual(false);
  });
});

const getDateSeconds = (date: Date): number => {
  return date.getTime() / 1000;
};

const fakeSystemTime = (date: Date): void => {
  jest.useFakeTimers();
  jest.setSystemTime(date);
};

const createFraudVC = (nbfDate: string): IdentityAssertionCredentialJWTClass => {
  return createVC(nbfDate, "fraudCRI");
};

const createVC = (nbfDate: string, issuer: string): IdentityAssertionCredentialJWTClass => {
  const nbfSeconds = getDateSeconds(new Date(nbfDate));
  return {
    iss: issuer,
    nbf: nbfSeconds,
    vc: {},
  };
};
