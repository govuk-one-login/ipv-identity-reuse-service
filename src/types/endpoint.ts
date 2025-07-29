export type ErrorResponse = {
  message: string;
};

export const isErrorResponse = (message: any): message is ErrorResponse => !!message && message.message;
