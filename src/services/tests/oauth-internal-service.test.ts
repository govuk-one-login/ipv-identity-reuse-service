import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { callSessionApi, getAuthorizationCode } from "../oauth-internal-service";
import { URL } from "node:url";

beforeEach(() => {
  vitest.clearAllMocks();
  vitest.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");
});

afterEach(() => {
  vitest.restoreAllMocks();
  vitest.unstubAllEnvs();
  vitest.unstubAllGlobals();
});

it("should call the /api/session fetch and return the raw response", async () => {
  const mockResponse = Response.json(
    { state: "test-state", redirect_uri: "https://test-uri.com", session_id: "test-session-id" },
    {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }
  );

  const jsonSpy = vitest.spyOn(mockResponse, "json");

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  const response = await callSessionApi("test-client-id", "test-request");

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "https://test.com/api/session",
    expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: "test-client-id",
        request: "test-request",
      }),
    })
  );

  expect(jsonSpy).toHaveBeenCalledTimes(1);
  expect(response.state).toEqual("test-state");
  expect(response.redirect_uri).toEqual("https://test-uri.com");
  expect(response.session_id).toEqual("test-session-id");
});

it("should call the /api/authorisation fetch and return the raw response, reading the JSON only once", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
      state: { value: "test-state" },
    },
    { status: 200 }
  );

  const jsonSpy = vitest.spyOn(mockResponse, "json");
  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  const response = await getAuthorizationCode(
    "test-client-id",
    "https://test-uri.com",
    "test-state",
    "test-session-id"
  );

  expect(jsonSpy).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledWith(
    new URL(
      "https://test.com/api/authorization?client_id=test-client-id&redirect_uri=https%3A%2F%2Ftest-uri.com&state=test-state&response_type=code"
    ),
    {
      method: "GET",
      headers: { "session-id": "test-session-id" },
    }
  );

  expect(response.redirect_uri).toEqual("https://api.example.com/");
  expect(response.authorizationCode).toEqual("test-auth-code");
  expect(response.state).toEqual("test-state");
});

it("should throw an error when the call to the /api/authorisation returns an empty state object", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: "test-auth-code",
      state: {},
    },
    { status: 200 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Invalid response properties received from authorization endpoint");
});

it("should throw an error when the /api/authorization API call returns 400", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: "test-auth-code",
      state: {},
    },
    { status: 400 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Authorize endpoint returned an error response");
});

it("should throw an error when the /api/authorization API call returns 500", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: "test-auth-code",
      state: {},
    },
    { status: 500 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Authorize endpoint returned an error response");
});
