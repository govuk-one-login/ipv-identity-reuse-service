export type CredentialStoreErrorResponse = {
  message: string;
};

export const isCredentialStoreErrorResponse = (message: unknown): message is CredentialStoreErrorResponse =>
  !!message && typeof message === "object" && (message as Record<string, never>).message;
