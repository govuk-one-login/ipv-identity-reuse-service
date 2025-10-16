export type CredentialStoreErrorResponse = {
  message: string;
};

export const isCredentialStoreErrorResponse = (message: any): message is CredentialStoreErrorResponse =>
  !!message && message.message;
