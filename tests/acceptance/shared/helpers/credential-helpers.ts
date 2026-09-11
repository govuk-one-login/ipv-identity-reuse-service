import { JWTHeaderParameters } from "jose";
import { getDefaultJwtHeader, sign } from "../../../../shared-test/jwt-utilities.js";
import { IdentityCheckCredentialJWTClass, FraudCheckType } from "@govuk-one-login/data-vocab/credentials.js";
import { evcsPostCredentials } from "../utils/evcs-api.js";
import assert from "node:assert";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUEIRA_PASSPORT } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/passports";
import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";
import { KENNETH_DECERQUEIRA_DVLA_DRIVING_PERMIT } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/drivinglicenses";

const DCMAW_ISSUER = "https://www.review-b.dev.account.gov.uk";

export const createAndPostCredentials = async (credentials: number, userId: string): Promise<string[]> => {
  const credentialJwts = [];
  const header: JWTHeaderParameters = getDefaultJwtHeader();
  for (let index = 0; index < credentials; index++) {
    const credentialPayload: IdentityCheckCredentialJWTClass = {
      sub: userId,
      iss: "https://cri.example.com",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        credentialSubject: {
          name: [KENNETH_DECERQUEIRA],
          birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        },
        evidence: [],
      },
    };
    credentialJwts.push(await sign(header, credentialPayload));
  }

  if (credentialJwts.length > 0) {
    const result = await evcsPostCredentials(
      userId,
      credentialJwts.map((jwt) => {
        return { vc: jwt, state: "CURRENT" };
      })
    );
    assert.equal(result.status, 202);
  }

  return credentialJwts;
};

export const createAndPostFraudCheckCredential = async (
  userId: string,
  nbfDate: Date,
  fraudCheckType?: string
): Promise<string> => {
  const header: JWTHeaderParameters = getDefaultJwtHeader();

  const evidence = fraudCheckType
    ? [
        {
          failedCheckDetails: [
            {
              checkMethod: "data" as const,
              fraudCheck: fraudCheckType as FraudCheckType,
            },
          ],
        },
      ]
    : [
        {
          checkDetails: [
            {
              checkMethod: "data" as const,
            },
          ],
        },
      ];

  const credentialPayload: IdentityCheckCredentialJWTClass = {
    sub: userId,
    iss: "https://review-f.dev.account.gov.uk",
    nbf: Math.floor(nbfDate.getTime() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      credentialSubject: {
        name: [KENNETH_DECERQUEIRA],
        birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        address: [KENNETH_DECERQUERIA_ADDRESS],
      },
      evidence,
    },
  };

  const fraudCheckJwt = await sign(header, credentialPayload);
  const result = await evcsPostCredentials(userId, [{ vc: fraudCheckJwt, state: "CURRENT" }]);
  assert.equal(result.status, 202);

  return fraudCheckJwt;
};

export const createAndPostDcmawDrivingPermitCredential = async (
  userId: string,
  vcNbfDate: Date,
  licenceExpiryDate: string
): Promise<string> => {
  const header: JWTHeaderParameters = getDefaultJwtHeader();

  const credentialPayload: IdentityCheckCredentialJWTClass = {
    sub: userId,
    iss: DCMAW_ISSUER,
    nbf: Math.floor(vcNbfDate.getTime() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      evidence: [
        {
          strengthScore: 3,
          validityScore: 2,
          checkDetails: [
            { checkMethod: "vcrypt" as const },
            {
              checkMethod: "bvr" as const,
              biometricVerificationProcessLevel: 2,
            },
          ],
        },
      ],
      credentialSubject: {
        name: [KENNETH_DECERQUEIRA],
        birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        drivingPermit: [
          {
            ...KENNETH_DECERQUEIRA_DVLA_DRIVING_PERMIT,
            expiryDate: licenceExpiryDate,
          },
        ],
      },
    },
  };

  const dcmawJwt = await sign(header, credentialPayload);
  const result = await evcsPostCredentials(userId, [{ vc: dcmawJwt, state: "CURRENT" }]);
  assert.equal(result.status, 202);

  return dcmawJwt;
};

export const createAndPostFailedDcmawDrivingPermitCredential = async (
  userId: string,
  vcNbfDate: Date,
  licenceExpiryDate: string
): Promise<string> => {
  const header: JWTHeaderParameters = getDefaultJwtHeader();

  const credentialPayload: IdentityCheckCredentialJWTClass = {
    sub: userId,
    iss: DCMAW_ISSUER,
    nbf: Math.floor(vcNbfDate.getTime() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      evidence: [
        {
          failedCheckDetails: [
            {
              checkMethod: "bvr" as const,
              biometricVerificationProcessLevel: 3,
            },
          ],
        },
      ],
      credentialSubject: {
        name: [KENNETH_DECERQUEIRA],
        birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        drivingPermit: [
          {
            ...KENNETH_DECERQUEIRA_DVLA_DRIVING_PERMIT,
            expiryDate: licenceExpiryDate,
          },
        ],
      },
    },
  };

  const dcmawJwt = await sign(header, credentialPayload);
  const result = await evcsPostCredentials(userId, [{ vc: dcmawJwt, state: "CURRENT" }]);
  assert.equal(result.status, 202);

  return dcmawJwt;
};

export const createAndPostDcmawPassportCredential = async (userId: string, vcNbfDate: Date): Promise<string> => {
  const header: JWTHeaderParameters = getDefaultJwtHeader();

  const credentialPayload: IdentityCheckCredentialJWTClass = {
    sub: userId,
    iss: DCMAW_ISSUER,
    nbf: Math.floor(vcNbfDate.getTime() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      evidence: [
        {
          strengthScore: 4,
          validityScore: 2,
          checkDetails: [
            { checkMethod: "vcrypt" as const },
            {
              checkMethod: "bvr" as const,
              biometricVerificationProcessLevel: 2,
            },
          ],
        },
      ],
      credentialSubject: {
        name: [KENNETH_DECERQUEIRA],
        birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
        passport: [KENNETH_DECERQUEIRA_PASSPORT],
      },
    },
  };

  const dcmawJwt = await sign(header, credentialPayload);
  const result = await evcsPostCredentials(userId, [{ vc: dcmawJwt, state: "CURRENT" }]);
  assert.equal(result.status, 202);

  return dcmawJwt;
};
