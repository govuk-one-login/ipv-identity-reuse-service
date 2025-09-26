export type CredentialStoreIdentityResponse = {
  si: JWTIncludingStateAndMetadata;
  vcs: JWTIncludingStateAndMetadata[];
  afterKey?: string;
};

interface JWTIncludingStateAndMetadata {
  state: string;
  vc: string;
  metadata: Metadata | null | string;
  signature?: string;
}

interface Metadata {
  [key: string]: unknown;
}
