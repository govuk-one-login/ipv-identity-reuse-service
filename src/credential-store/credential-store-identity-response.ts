import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

export type CredentialStoreIdentityResponse = {
  si: StoredIdentityObject;
  vcs: VerifiableCredentialObject[];
  afterKey?: string;
};

export interface StoredIdentityObject {
  state: string;
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
