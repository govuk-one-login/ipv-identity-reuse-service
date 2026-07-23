import { describe, expect, it } from "vitest";
import { getProperty } from "../case-insensitive-header-utilities";

describe("case-insensitive-header-utilities", () => {
  const expected = "Bearer 123456";
  const headers = {
    Authorization: expected,
  };

  it("should return correct value with exact key", async () => {
    const result = getProperty(headers, "Authorization");
    expect(result).toBe(expected);
  });

  it("should return correct value with all lower case key", async () => {
    const result = getProperty(headers, "authorization");
    expect(result).toBe(expected);
  });

  it("should return correct value with all upper case key", async () => {
    const result = getProperty(headers, "AUTHORIZATION");
    expect(result).toBe(expected);
  });

  it("should return undefined with no matching key", async () => {
    const result = getProperty(headers, "not a key");
    expect(result).toBeUndefined();
  });

  it("should return first match if multiple keys found", async () => {
    const result = getProperty(
      {
        Authorization: expected,
        AUTHORIZATION: "not expected",
      },
      "AUTHORIZATION"
    );
    expect(result).toBe(expected);
  });
});
