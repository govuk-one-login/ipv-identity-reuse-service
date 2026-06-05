import { isStringWithLength } from "../string-utilities";
import { describe, it, expect } from "vitest";

describe("isStringWithLength", () => {
  it("should return false if value is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined -- Parameter required
    expect(isStringWithLength(undefined)).toEqual(false);
  });

  it("should return false if value is empty string", () => {
    expect(isStringWithLength("")).toEqual(false);
  });

  it("should return false for value that is not a string type", () => {
    expect(isStringWithLength(100)).toEqual(false);
    expect(isStringWithLength({})).toEqual(false);
  });

  it("should return true if value is a string with length", () => {
    expect(isStringWithLength("hello")).toEqual(true);
  });
});
