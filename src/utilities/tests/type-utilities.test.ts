import { describe, expect, it, vi } from "vitest";
import {
  isArrayOfType,
  isNonNullObject,
  isNumber,
  isString,
  isTypeWhenDefined,
  parseJsonWithTypeValidation,
} from "../type-utilities.js";
import { JsonParseError } from "../errors.js";

vi.mock("../logger.js");

describe("isNonNullObject", () => {
  it("should return false if value is null", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isNonNullObject(null)).toEqual(false);
  });

  it("should return false if value is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isNonNullObject(undefined)).toEqual(false);
  });

  it("should return false for value that is not an object type", () => {
    expect(isNonNullObject(100)).toEqual(false);
    expect(isNonNullObject("a-string")).toEqual(false);
  });

  it("should return true if value is object", () => {
    expect(isNonNullObject({ key: "value" })).toEqual(true);
    expect(isNonNullObject(["array-string"])).toEqual(true);
  });
});

describe("isString", () => {
  it("should return false if value is null", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isString(null)).toEqual(false);
  });

  it("should return false if value is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isString(undefined)).toEqual(false);
  });

  it("should return false for value that is not a string type", () => {
    expect(isString(100)).toEqual(false);
    expect(isString({})).toEqual(false);
  });

  it("should return true if value is empty string", () => {
    expect(isString("")).toEqual(true);
  });

  it("should return true if value is a string with length", () => {
    expect(isString("hello")).toEqual(true);
  });
});

describe("isNumber", () => {
  it("should return false if value is null", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isNumber(null)).toEqual(false);
  });

  it("should return false if value is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isNumber(undefined)).toEqual(false);
  });

  it("should return false for value that is not a number", () => {
    expect(isNumber("100")).toEqual(false);
    expect(isNumber({})).toEqual(false);
    expect(isNumber([100])).toEqual(false);
  });

  it("should return true if value is a number", () => {
    expect(isNumber(100)).toEqual(true);
  });
});

describe("isArrayOfType", () => {
  it("should return false if value is null", () => {
    /* eslint-disable unicorn/no-null */
    expect(isArrayOfType(null, (value: unknown) => typeof value === "string")).toEqual(false);
    expect(isArrayOfType(null, (value: unknown) => typeof value === "object")).toEqual(false);
    expect(isArrayOfType(null, (value: unknown) => typeof value === "number")).toEqual(false);
    /* eslint-enable unicorn/no-null */
  });

  it("should return false if value is undefined", () => {
    expect(isArrayOfType(undefined, (value: unknown) => typeof value === "string")).toEqual(false);
    expect(isArrayOfType(undefined, (value: unknown) => typeof value === "object")).toEqual(false);
    expect(isArrayOfType(undefined, (value: unknown) => typeof value === "number")).toEqual(false);
  });

  it("should return false for value that is not an array and type matches", () => {
    expect(isArrayOfType("a-string", (value: unknown) => typeof value === "string")).toEqual(false);
    expect(isArrayOfType({}, (value: unknown) => typeof value === "object")).toEqual(false);
    expect(isArrayOfType(100, (value: unknown) => typeof value === "number")).toEqual(false);
  });

  it("should return false for array of different types", () => {
    expect(isArrayOfType(["a-string", 100], (value: unknown) => typeof value === "string")).toEqual(false);
    expect(isArrayOfType(["hello", 100], (value: unknown) => typeof value === "number")).toEqual(false);
  });

  it("should return true for value that is an array with length and type matches", () => {
    expect(isArrayOfType(["a-string"], (value: unknown) => typeof value === "string")).toEqual(true);
    expect(isArrayOfType([{}], (value: unknown) => typeof value === "object")).toEqual(true);
    expect(isArrayOfType([100], (value: unknown) => typeof value === "number")).toEqual(true);
  });

  it("should return true for value that is an empty array", () => {
    expect(isArrayOfType([], (value: unknown) => typeof value === "string")).toEqual(true);
    expect(isArrayOfType([], (value: unknown) => typeof value === "object")).toEqual(true);
    expect(isArrayOfType([], (value: unknown) => typeof value === "number")).toEqual(true);
  });
});

describe("isTypeWhenDefined", () => {
  it("should return true if value is undefined", () => {
    expect(isTypeWhenDefined(undefined, (value: unknown) => typeof value === "string")).toEqual(true);
    expect(isTypeWhenDefined(undefined, (value: unknown) => typeof value === "object")).toEqual(true);
    expect(isTypeWhenDefined(undefined, (value: unknown) => typeof value === "number")).toEqual(true);
  });

  it("should return true if value is defined and correct type", () => {
    expect(isTypeWhenDefined("a-string", (value: unknown) => typeof value === "string")).toEqual(true);
    expect(isTypeWhenDefined({}, (value: unknown) => typeof value === "object")).toEqual(true);
    expect(isTypeWhenDefined(100, (value: unknown) => typeof value === "number")).toEqual(true);
  });

  it("should return false if value is defined but incorrect type", () => {
    expect(isTypeWhenDefined("a-string", (value: unknown) => typeof value === "number")).toEqual(false);
    expect(isTypeWhenDefined({}, (value: unknown) => typeof value === "string")).toEqual(false);
    expect(isTypeWhenDefined(100, (value: unknown) => typeof value === "object")).toEqual(false);
  });
});

describe("parseJsonWithTypeValidation", () => {
  interface MyType {
    key1: string;
    key2: string;
  }

  const jsonTypePredicate = (value: unknown): value is MyType => {
    if (!isNonNullObject(value)) return false;
    const object = value as Record<string, unknown>;
    return isString(object.key1) && isString(object.key2);
  };

  it("should return valid object if string is valid JSON and matches expected type", () => {
    const validObject: MyType = { key1: "1", key2: "2" };
    expect(parseJsonWithTypeValidation(JSON.stringify(validObject), jsonTypePredicate)).toEqual(validObject);
  });

  it("should throw error if string is not valid JSON", () => {
    const invalidJson = '{ "key1": "1", "key2": "2" }}';
    expect(() => parseJsonWithTypeValidation(invalidJson, jsonTypePredicate)).toThrow(
      new JsonParseError("Failed to parse JSON")
    );
  });

  it("should throw error if string is valid JSON but does not match expected type", () => {
    const invalidJson = '{ "key1": 1, "key2": 2 }';
    expect(() => parseJsonWithTypeValidation(invalidJson, jsonTypePredicate)).toThrow(
      new JsonParseError("JSON object does not match expected type")
    );
  });
});
