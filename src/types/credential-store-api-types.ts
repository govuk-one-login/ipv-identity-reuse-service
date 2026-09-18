import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";

export type CredentialStoreIdentityResponse = {
  si: StoredIdentityObject;
  vcs: VerifiableCredentialObject[];
  afterKey?: string;
};

export interface StoredIdentityObject {
  vc: string;
  metadata: Metadata | string | undefined;
  unsignedVot: IdentityVectorOfTrust;
}

export interface VerifiableCredentialObject {
  state: string;
  vc: string;
  metadata: Metadata | string | undefined;
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
