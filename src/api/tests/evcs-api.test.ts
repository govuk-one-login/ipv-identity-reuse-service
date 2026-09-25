import { IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials.js";
import { describe, expect, it, vitest } from "vitest";
import { getDefaultJwtHeader, sign } from "../../../shared-test/jwt-utilities.js";
import { getConfiguration, getServiceApiKey, type Configuration } from "../../commons/configuration.js";
import { getIdentityFromEVCS, invalidateIdentityInEVCS, VerifiableCredentialObject } from "../evcs-api.js";

describe("temporarily empty", () => {
  it("temporarily empty", async () => {
    await createVerifiableCredentialWithState("iss1", "CURRENT");
    expect(true).toBe(true);
  });
});

vitest.mock("../../commons/configuration.js");

describe("getIdentityFromEVCS", () => {
  it("should call fetch with the correct values", async () => {
    vitest.mocked(getConfiguration).mockResolvedValue({
      evcsApiUrl: "https://api.example.com",
    } as Configuration);
    vitest.mocked(getServiceApiKey).mockResolvedValue("api-key");

    const mockResponse = Response.json("");
    vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

    await expect(getIdentityFromEVCS("auth.token")).resolves.toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.example.com/identity", {
      method: "GET",
      headers: {
        Authorization: "auth.token",
        "x-api-key": "api-key",
      },
    });
  });
});

describe("invalidateIdentityInEVCS", () => {
  it("should call fetch with the correct values", async () => {
    vitest.mocked(getConfiguration).mockResolvedValue({
      evcsApiUrl: "https://api.example.com",
    } as Configuration);
    vitest.mocked(getServiceApiKey).mockResolvedValue("api-key");

    const mockResponse = Response.json("");
    vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

    await expect(invalidateIdentityInEVCS("auth.token")).resolves.toEqual(mockResponse);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.example.com/identity/invalidate", {
      method: "POST",
      headers: {
        "x-api-key": "api-key",
      },
      body: '{"userId":"auth.token"}',
    });
  });
});

const createVerifiableCredentialWithState = async (
  issuer: string,
  state: string
): Promise<VerifiableCredentialObject> => {
  return {
    state: state,
    vc: await sign(getDefaultJwtHeader(), getVerifiableCredential(issuer)),
    metadata: undefined,
  };
};

const getVerifiableCredential = (issuer: string): IdentityCheckCredentialJWTClass => {
  return {
    iss: issuer,
    nbf: 1234,
    sub: "user1234",
    vc: {
      evidence: [],
    },
  };
};
