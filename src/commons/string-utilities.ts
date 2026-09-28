export const getString = (input: string | Uint8Array | undefined): string | undefined => {
  if (typeof input == "string") {
    return input;
  }
  if (input instanceof Uint8Array) {
    return new TextDecoder().decode(input);
  }
};

export const isStringWithLength = (value: unknown): value is string => typeof value === "string" && value.length > 0;

export const compareStringAscending = (a: string, b: string) => (a > b ? 1 : -1);
export const compareStringDescending = (a: string, b: string) => (a < b ? 1 : -1);
