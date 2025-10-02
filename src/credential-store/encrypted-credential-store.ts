import { getConfiguration, getServiceApiKey } from "../commons/configuration";
import { CredentialStoreIdentityResponse } from "./credential-store-identity-response";
import { VerifiableCredentialJWT } from "../identity-reuse/verifiable-credential-jwt";
import { getJwtBody } from "../commons/jwt-utils";

export const getIdentityFromCredentialStore = async (authorizationToken: string): Promise<Response> => {
  const configuration = await getConfiguration();
  const apiKey = await getServiceApiKey();

  return await fetch(`${configuration.evcsApiUrl}/identity`, {
    method: "GET",
    headers: {
      Authorization: authorizationToken,
      ...(apiKey && { "x-api-key": apiKey }),
    },
  });
};

export const invalidateIdentityInCredentialStore = async (userId: string): Promise<Response> => {
  const configuration = await getConfiguration();
  const apiKey = await getServiceApiKey();

  return await fetch(`${configuration.evcsApiUrl}/identity/invalidate`, {
    method: "POST",
    body: JSON.stringify({ userId: userId }),
    headers: {
      ...(apiKey && { "x-api-key": apiKey }),
    },
  });
};

export const parseCurrentVerifiableCredentials = (
  identityResponse: CredentialStoreIdentityResponse
): VerifiableCredentialJWT[] => {
  return identityResponse.vcs
    .filter((encodedVcWithState) => encodedVcWithState.state === "CURRENT")
    .map((encodedVcWithState) => getJwtBody<VerifiableCredentialJWT>(encodedVcWithState.vc));
};
