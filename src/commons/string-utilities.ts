export const getString = (input: string | Uint8Array | undefined): string | undefined => {
  if (typeof input == "string") {
    return input;
  }
  if (input instanceof Uint8Array) {
    return new TextDecoder().decode(input);
  }
};

export const isStringWithLength = (value: unknown): value is string => typeof value === "string" && value.length > 0;
