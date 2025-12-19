import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";
import { getJwtBody } from "../commons/jwt-utils";
import logger from "../commons/logger";
import { getConfiguration, getServiceApiKey } from "./configuration";
import { VerifiableCredentialJWT } from "../commons/verifiable-credential-jwt";

export type CredentialStoreIdentityResponse = {
  si: StoredIdentityObject;
  vcs: VerifiableCredentialObject[];
  afterKey?: string;
};

export interface StoredIdentityObject {
  vc: string;
  metadata: Metadata | null | string;
  unsignedVot: IdentityVectorOfTrust;
}

export interface VerifiableCredentialObject {
  state: string;
  vc: string;
  metadata: Metadata | null | string;
  signature?: string;
}

interface Metadata {
  [key: string]: unknown;
}

export type CredentialStoreErrorResponse = {
  message: string;
};

export const isCredentialStoreErrorResponse = (message: unknown): message is CredentialStoreErrorResponse =>
  !!message && typeof message === "object" && (message as Record<string, never>).message;

export const getIdentityFromCredentialStore = async (authorizationToken: string): Promise<Response> => {
  const configuration = await getConfiguration();
  const apiKey = await getServiceApiKey();

  logger.info("Retrieving identity");

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

  logger.info("Invalidating identity");

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
