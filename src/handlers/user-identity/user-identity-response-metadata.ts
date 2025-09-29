import { UserIdentityResponse } from "./user-identity-response";

export interface UserIdentityResponseMetadata {
  content: UserIdentityResponse;
  isValid: boolean;
  expired: boolean;
  vot: string;
  kidValid: boolean;
  signatureValid: boolean;
}
