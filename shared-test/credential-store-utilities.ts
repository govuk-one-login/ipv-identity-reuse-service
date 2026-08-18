import { JWTHeaderParameters } from "jose";
import { CredentialStoreIdentityResponse } from "../src/credential-store/credential-store-identity-response";
import { getDefaultJwtHeader, sign } from "./jwt-utilities";

const CURRENT = "CURRENT";

export const createStoredIdentityRecord = (...credentialSignatures: string[]) => {
  const base = { sub: "user-sub", vot: "P2", vtm: "https://oidc.account.gov.uk/trustmark" };
  return credentialSignatures.length > 0 ? { ...base, credentials: credentialSignatures } : base;
};

export const createSignedIdentityCheckCredentialJWT = async (issuer: string, nbfDate?: string): Promise<string> => {
  const nbf = Math.floor((nbfDate ? new Date(nbfDate).getTime() : Date.now()) / 1000);
  return await sign(getDefaultJwtHeader(), {
    iss: issuer,
    nbf,
    sub: "sdf",
    vc: { evidence: [{}], type: ["VerifiableCredential", "IdentityCheckCredential"] },
  });
};

export const createCredentialStoreIdentityResponseWithStates = async (
  credentialsAndStates: { signedVc: string; state: string }[],
  header: JWTHeaderParameters = getDefaultJwtHeader(),
  forcedCredentialSignatures?: string[]
): Promise<{ mockEVCSData: CredentialStoreIdentityResponse; credentialSignatures: string[] }> => {
  const vcs = credentialsAndStates.map((c) => ({ state: c.state, vc: c.signedVc, metadata: undefined }));
  const credentialSignatures =
    forcedCredentialSignatures ?? credentialsAndStates.map((c) => c.signedVc.split(".").at(2)!);
  const storedIdentity = createStoredIdentityRecord(...credentialSignatures);
  return {
    mockEVCSData: { si: { vc: await sign(header, storedIdentity), metadata: undefined, unsignedVot: "P3" }, vcs },
    credentialSignatures,
  };
};

export const createCredentialStoreIdentityResponse = async (
  signedVcs: string[],
  header: JWTHeaderParameters = getDefaultJwtHeader(),
  forcedCredentialSignatures?: string[]
) =>
  createCredentialStoreIdentityResponseWithStates(
    signedVcs.map((vc) => ({ signedVc: vc, state: CURRENT })),
    header,
    forcedCredentialSignatures
  );

export const createInvalidIdentityCheckCredentialJWT = (issuer: string, nbfDate?: string): string => {
  const nbf = Math.floor((nbfDate ? new Date(nbfDate).getTime() : Date.now()) / 1000);
  const headers = getDefaultJwtHeader();
  const jwt = {
    headers: headers,
    body: {
      iss: issuer,
      nbf,
      sub: "sdf",
    },
  };

  return jwt + "aaa";
};
