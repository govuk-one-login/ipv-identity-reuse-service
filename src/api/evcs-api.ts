import { getConfiguration, getServiceApiKey } from "../commons/configuration.js";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";

export type EVCSIdentityResponse = {
  si: StoredIdentityObject;
  vcs: VerifiableCredentialObject[];
  afterKey?: string;
};

export type StoredIdentityObject = {
  vc: string;
  metadata?: Metadata | string;
  unsignedVot: IdentityVectorOfTrust;
};

export type VerifiableCredentialObject = {
  state: string;
  vc: string;
  metadata?: Metadata | string;
  signature?: string;
};

export type Metadata = {
  [key: string]: unknown;
};

export type EVCSErrorResponse = {
  message: string;
};

export const getIdentityFromEVCS = async (authorizationToken: string): Promise<Response> => {
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

export const invalidateIdentityInEVCS = async (userId: string): Promise<Response> => {
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

export const isEVCSErrorResponse = (message: unknown): message is EVCSErrorResponse =>
  !!message && typeof message === "object" && (message as Record<string, never>).message;
