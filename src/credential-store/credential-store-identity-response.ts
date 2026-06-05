import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

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
