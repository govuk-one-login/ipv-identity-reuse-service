import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { getDefaultJwtHeader, renderDid, sign } from "../../../../shared-test/jwt-utilities.js";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { evcsPostIdentity } from "../utils/evcs-api.js";
import assert from "node:assert";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";

export async function createStoredIdentityWithVot(
  userId: string,
  credentialJwts: string[],
  signedVot: IdentityVectorOfTrust,
  controllerUrn: string,
  keyId: string,
  unsignedVot?: IdentityVectorOfTrust,
  maxVot?: IdentityVectorOfTrust
) {
  const header: JWTHeaderParameters = getDefaultJwtHeader("ES256", renderDid(controllerUrn, keyId));

  const allCredentialSignatures = credentialJwts.map((jwt) => jwt.split(".").at(-1));

  const payload: JWTPayload = {
    sub: userId,
    iss: "https://api.example.com",
    credentials: allCredentialSignatures,
    vot: signedVot,
    claims: {
      "https://vocab.account.gov.uk/v1/coreIdentity": {
        name: [KENNETH_DECERQUEIRA],
        birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
      },
      "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
    },
    ...(maxVot && { max_vot: maxVot }),
  };
  const jwt = await sign(header, payload, true);

  const result = await evcsPostIdentity(userId, {
    vot: unsignedVot || signedVot,
    jwt,
  });
  assert.equal(result.status, 202);
}
