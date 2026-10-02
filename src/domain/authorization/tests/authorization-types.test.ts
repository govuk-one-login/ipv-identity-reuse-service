import { describe, expect, it } from "vitest";
import { isValidQueryParameters } from "../authorization-types.js";

describe("isValidQueryParameters", () => {
  it("should return true if valid", () => {
    expect(isValidQueryParameters({ client_id: "client-id" })).toBeTruthy();
  });

  it("should return false if the object is undefined", () => {
    // eslint-disable-next-line unicorn/no-useless-undefined
    expect(isValidQueryParameters(undefined)).toBeFalsy();
  });

  it("should return false if the object is null", () => {
    // eslint-disable-next-line unicorn/no-null
    expect(isValidQueryParameters(null)).toBeFalsy();
  });

  it("should return false if the client_id is empty string", () => {
    expect(isValidQueryParameters({ client_id: "" })).toBeFalsy();
  });

  it("should return false if the client_id is empty string with spaces", () => {
    expect(isValidQueryParameters({ client_id: "    " })).toBeFalsy();
  });
});
