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
  userIdentityDataType: UserIdentityDataType;
  isValid: boolean;
  kidValid: boolean;
  signatureValid: boolean;
  expired: boolean;
  vot: string;
}
