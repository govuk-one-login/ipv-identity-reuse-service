import { isString } from "./type-utilities.js";

export const getString = (input: string | Uint8Array): string => {
  return isString(input) ? input : new TextDecoder().decode(input);
};

export const isStringWithLength = (value: unknown): value is string => isString(value) && value.trim().length > 0;

export const compareStringAscending = (a: string, b: string) => (a > b ? 1 : -1);
export const compareStringDescending = (a: string, b: string) => (a < b ? 1 : -1);
