import { hasFraudCheckExpired } from "../fraudCheckService";
import {
  FraudCheckType,
  IdentityCheckClass,
  IdentityCheckCredentialJWTClass,
  RiskAssessmentCredentialJWTClass,
  SecurityCheckCredentialJWTClass,
} from "@govuk-one-login/data-vocab/credentials";

const mockSuccessfulEvidence: IdentityCheckClass = {
  checkDetails: [
    {
      checkMethod: "data",
    },
  ],
};

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
      const vcBundle = [
        createValidFraudVC(fraudNbfDate),
        createIdentityCheckCredentialJWT("2025-07-25T15:35:58.000Z", "passportCRI", mockSuccessfulEvidence),
      ];

      fakeSystemTime(new Date(mockSystemDate));
      const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, validityPeriodHours);
      expect(fraudCheckExpired).toEqual(expiryResult);
    }
  );

  it("should return true if no fraud VC exists in bundle", () => {
    const vcBundle = [
      createIdentityCheckCredentialJWT("2025-08-25T15:35:58.000Z", "passportCRI", mockSuccessfulEvidence),
    ];
    fakeSystemTime(new Date("2025-09-10T15:35:58.000Z"));
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(true);
  });

  it("should use fraud credential with latest nbf if multiple exist in a bundle", () => {
    const vcBundle = [createValidFraudVC("2025-01-25T15:35:58.000Z"), createValidFraudVC("2025-07-26T15:35:58.000Z")];
    fakeSystemTime(new Date("2025-08-24T15:35:58.000Z"));
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(false);

    const fraudCheckExpiredReversed = hasFraudCheckExpired("fraudCRI", vcBundle.reverse(), 4320);
    expect(fraudCheckExpiredReversed).toEqual(false);
  });

  it("should return false when the fraud credential has failedCheckDetails with fraudCheckType applicable_authoritative_source", () => {
    const nbfDateExpired = "2025-01-25T15:35:58.000Z";
    const vcBundle = [
      createInvalidFraudVC(nbfDateExpired, "applicable_authoritative_source"),
      createSecurityCheckCredentialJWT(),
      createRiskAssessmentCredentialJWT(),
    ];
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(false);
  });

  it("should return true when the fraud credential has failedCheckDetails with fraudCheckType available_authoritative_source", () => {
    const nbfDateNotExpired = "2025-08-25T15:35:58.000Z";
    const vcBundle = [
      createInvalidFraudVC(nbfDateNotExpired, "available_authoritative_source"),
      createSecurityCheckCredentialJWT(),
      createRiskAssessmentCredentialJWT(),
    ];
    const fraudCheckExpired = hasFraudCheckExpired("fraudCRI", vcBundle, 4320);
    expect(fraudCheckExpired).toEqual(true);
  });
});

const getDateSeconds = (date: Date): number => {
  return date.getTime() / 1000;
};

const fakeSystemTime = (date: Date): void => {
  jest.useFakeTimers();
  jest.setSystemTime(date);
};

const createValidFraudVC = (nbfDate: string): IdentityCheckCredentialJWTClass => {
  return createIdentityCheckCredentialJWT(nbfDate, "fraudCRI", mockSuccessfulEvidence);
};

const createInvalidFraudVC = (nbfDate: string, fraudCheckType: FraudCheckType): IdentityCheckCredentialJWTClass => {
  return createIdentityCheckCredentialJWT(nbfDate, "fraudCRI", {
    failedCheckDetails: [
      {
        fraudCheck: fraudCheckType,
      },
    ],
  });
};

const createIdentityCheckCredentialJWT = (
  nbfDate: string,
  issuer: string,
  evidence: IdentityCheckClass
): IdentityCheckCredentialJWTClass => {
  const nbfSeconds = getDateSeconds(new Date(nbfDate));
  return {
    iss: issuer,
    nbf: nbfSeconds,
    sub: "sdf",
    vc: {
      evidence: [evidence],
      type: ["VerifiableCredential", "IdentityCheckCredential"],
    },
  };
};

const createSecurityCheckCredentialJWT = (): SecurityCheckCredentialJWTClass => {
  return {
    iss: "cimit",
    nbf: getDateSeconds(new Date("2025-01-25T15:35:58.000Z")),
    vc: {
      evidence: [{}],
      type: ["VerifiableCredential", "SecurityCheckCredential"],
    },
  };
};

const createRiskAssessmentCredentialJWT = (): RiskAssessmentCredentialJWTClass => {
  return {
    iss: "ticfCRI",
    nbf: getDateSeconds(new Date("2025-01-25T15:35:58.000Z")),
    vc: {
      evidence: [{}],
      type: ["VerifiableCredential", "RiskAssessmentCredential"],
    },
  };
};
