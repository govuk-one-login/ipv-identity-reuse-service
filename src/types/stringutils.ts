/**
 * Utility function to transform the given input into a string.
 * @param input The input to convert.
 * @returns The converted result
 */
export const getString = (input: string | Uint8Array | undefined): string | undefined => {
  if (typeof input == "string") {
    return input;
  }
  if (input instanceof Uint8Array) {
    return new TextDecoder().decode(input);
  }
};
