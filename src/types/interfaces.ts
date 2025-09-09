export interface UserIdentityInput {
  govukSigninJourneyId: string;
  vtr: string[];
}

export interface UserIdentityDataType {
  sub: string;
  vot: string;
  vtm: string[];
}
export interface StoredIdentityResponse {
  content: UserIdentityDataType;
  isValid: boolean;
  expired: boolean;
  vot: string;
  kidValid: boolean;
  signatureValid: boolean;
}

export interface Metadata {
  [key: string]: unknown;
}

export interface JWTIncludingStateAndMetadata {
  state: string;
  vc: string;
  metadata: Metadata | null | string;
  signature?: string;
}

export type EvcsStoredIdentityResponse = {
  si: JWTIncludingStateAndMetadata;
  vcs: JWTIncludingStateAndMetadata[];
  afterKey?: string;
};

export interface VerifiableCredential {
  iss: string;
  nbf: number;
}
