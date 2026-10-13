import logger from "./logger.js";
import { JsonParseError } from "./errors.js";

export const isNonNullObject = (value: unknown): value is object => typeof value === "object" && value !== null;
export const isString = (value: unknown): value is string => typeof value === "string";
export const isNumber = (value: unknown): value is number => typeof value === "number";

export function isArrayOfType<T>(value: unknown, typePredicate: (item: unknown) => item is T): value is T[] {
  return Array.isArray(value) && value.every((item) => typePredicate(item));
}

export function isTypeWhenDefined<T>(value: unknown, typePredicate: (item: unknown) => item is T): boolean {
  if (value === undefined) return true;
  return typePredicate(value);
}

export function parseJsonWithTypeValidation<T>(jsonString: string, typePredicate: (value: unknown) => value is T): T {
  let object: unknown;

  try {
    object = JSON.parse(jsonString);
  } catch (error) {
    logger.error("Failed to parse JSON");
    throw new JsonParseError("Failed to parse JSON", { cause: error });
  }

  if (typePredicate(object)) {
    return object;
  } else {
    logger.error("JSON object does not match expected type");
    throw new JsonParseError("JSON object does not match expected type");
  }
}
