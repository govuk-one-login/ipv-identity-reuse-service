import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequiredEnvironment } from "../get-required-environment";

const EXPECTED_ERROR = "Environment variable TEST_VAR must be defined";

describe("getRequiredEnvironment", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should return the value when the environment variable is set", () => {
    vi.stubEnv("TEST_VAR", "hello");

    const result = getRequiredEnvironment("TEST_VAR");

    expect(result).toBe("hello");
  });

  it("should throw when the environment variable is not set", () => {
    vi.stubEnv("TEST_VAR", undefined as unknown as string);

    expect(() => getRequiredEnvironment("TEST_VAR")).toThrow(EXPECTED_ERROR);
  });

  it("should throw when the environment variable is an empty string", () => {
    vi.stubEnv("TEST_VAR", "");

    expect(() => getRequiredEnvironment("TEST_VAR")).toThrow(EXPECTED_ERROR);
  });
});
