export type ErrorResponse = {
  message: string;
};

/**
 * Test whether this object is an error response
 * @param message The message object
 * @returns true if this is an ErrorResponse and casts the object
 */
export const isErrorResponse = (message: any): message is ErrorResponse => !!message && message.message;
