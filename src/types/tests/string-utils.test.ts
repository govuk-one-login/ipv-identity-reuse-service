import { isStringWithLength } from "../string-utils";

describe("isStringWithLength", () => {
  it("should return false if value is undefined", () => {
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
