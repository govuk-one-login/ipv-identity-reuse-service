import { compareStringAscending, getString, isStringWithLength } from "../string-utilities.js";
import { describe, it, expect } from "vitest";

describe("getString", () => {
  it("should return the same string when given a string", () => {
    expect(getString("test-string")).toEqual("test-string");
  });

  it("should return an empty string when given an empty string", () => {
    expect(getString("")).toEqual("");
  });

  it("should decode a Uint8Array to a string", () => {
    const input = new TextEncoder().encode("test-string");
    expect(getString(input)).toEqual("test-string");
  });

  it("should return an empty string when given an empty Uint8Array", () => {
    expect(getString(new Uint8Array())).toEqual("");
  });

  it("should return undefined when given undefined", () => {
    expect(getString(undefined)).toBeUndefined();
  });
});

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

describe("compareStringAscending", () => {
  it("should return the correct values", () => {
    expect(compareStringAscending("P1", "P2")).equals(-1);
    expect(compareStringAscending("P1", "P1")).equals(-1);
    expect(compareStringAscending("P2", "P1")).equals(1);
  });
  it("already sorted string should be the same", () => {
    expect(["P1", "P2", "P3"].toSorted(compareStringAscending)).toEqual(["P1", "P2", "P3"]);
  });
  it("opposite sorted string should be sorted", () => {
    expect(["P3", "P2", "P1"].toSorted(compareStringAscending)).toEqual(["P1", "P2", "P3"]);
  });
  it("random sorted string should be sorted", () => {
    expect(["P2", "P3", "P1", "P0"].toSorted(compareStringAscending)).toEqual(["P0", "P1", "P2", "P3"]);
  });
});
