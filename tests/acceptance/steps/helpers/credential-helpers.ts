import { JWTHeaderParameters } from "jose";
import { getDefaultJwtHeader, sign } from "../../../../shared-test/jwt-utils";
import { IdentityCheckCredentialJWTClass, FraudCheckType } from "@govuk-one-login/data-vocab/credentials";
import { evcsPostCredentials } from "../utils/evcs-api";
import assert from "assert";

export const createAndPostCredentials = async (credentials: number, userId: string): Promise<string[]> => {
  const credentialJwts = [];
  const header: JWTHeaderParameters = getDefaultJwtHeader();
  for (let i = 0; i < credentials; i++) {
    const credentialPayload: IdentityCheckCredentialJWTClass = {
      sub: userId,
      iss: "http://cri.example.com",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [],
      },
    };
    credentialJwts.push(await sign(header, credentialPayload));
  }

  if (credentialJwts.length) {
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

  let evidence;
  if (fraudCheckType) {
    evidence = [
      {
        failedCheckDetails: [
          {
            checkMethod: "data" as const,
            fraudCheck: fraudCheckType as FraudCheckType,
          },
        ],
      },
    ];
  } else {
    evidence = [
      {
        checkDetails: [
          {
            checkMethod: "data" as const,
          },
        ],
      },
    ];
  }

  const credentialPayload: IdentityCheckCredentialJWTClass = {
    sub: userId,
    iss: "https://review-f.dev.account.gov.uk",
    nbf: Math.floor(nbfDate.getTime() / 1000),
    vc: {
      type: ["VerifiableCredential", "IdentityCheckCredential"],
      evidence,
    },
  };

  const fraudCheckJwt = await sign(header, credentialPayload);
  const result = await evcsPostCredentials(userId, [{ vc: fraudCheckJwt, state: "CURRENT" }]);
  assert.equal(result.status, 202);

  return fraudCheckJwt;
};
