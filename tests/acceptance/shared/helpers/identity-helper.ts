import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { getDefaultJwtHeader, renderDid, sign } from "../../../../shared-test/jwt-utilities.js";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { evcsPostIdentity } from "../utils/evcs-api.js";
import assert from "node:assert";

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
    iss: "http://api.example.com",
    credentials: allCredentialSignatures,
    vot: signedVot,
    ...(maxVot && { max_vot: maxVot }),
  };
  const jwt = await sign(header, payload, true);

  const result = await evcsPostIdentity(userId, {
    vot: unsignedVot || signedVot,
    jwt,
  });
  assert.equal(result.status, 202);
}
