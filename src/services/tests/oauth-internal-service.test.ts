import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { callSessionApi, getAuthorizationCode } from "../oauth-internal-service";
import { URL } from "node:url";

const { mockError } = vitest.hoisted(() => {
  return {
    mockError: vitest.fn(),
  };
});

vitest.hoisted(() => {
  process.env.SESSION_TIMEOUT_MS = "5000";
});

vitest.mock("@aws-lambda-powertools/logger", () => {
  return {
    Logger: class {
      error = mockError;
      constructor() {}
    },
  };
});

beforeEach(() => {
  vitest.clearAllMocks();
  vitest.stubEnv("OAUTH_INTERNAL_API_URL", "https://test.com");
});

afterEach(() => {
  vitest.restoreAllMocks();
  vitest.unstubAllEnvs();
  vitest.unstubAllGlobals();
});

it("should call the /api/session fetch and return the SessionResult response", async () => {
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
      signal: expect.any(AbortSignal),
    })
  );

  expect(jsonSpy).toHaveBeenCalledTimes(1);
  expect(response.state).toEqual("test-state");
  expect(response.redirect_uri).toEqual("https://test-uri.com");
  expect(response.session_id).toEqual("test-session-id");
});

it("should throw an error if the /api/session fetch returns a 403 status code", async () => {
  const mockResponse = Response.json({}, { status: 403 });
  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(callSessionApi("test-client-id", "test-request")).rejects.toThrow(
    "Session endpoint returned an error response"
  );
  expect(mockError).toHaveBeenCalledWith(expect.stringContaining("Session handler returned non-201 status: 403"));
});

it("should call the /api/authorisation fetch and return the AuthorizationResult response, reading the JSON only once", async () => {
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
      signal: expect.any(AbortSignal),
    }
  );

  expect(response.redirect_uri).toEqual("https://api.example.com/");
  expect(response.authorizationCode).toEqual("test-auth-code");
  expect(response.state).toEqual("test-state");
});

it("should return redirect_uri and state without authorizationCode when the /api/authorization API call returns 403", async () => {
  const mockResponse = Response.json({}, { status: 403 });
  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  const response = await getAuthorizationCode(
    "test-client-id",
    "https://test-uri.com",
    "test-state",
    "test-session-id"
  );

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledWith(
    new URL(
      "https://test.com/api/authorization?client_id=test-client-id&redirect_uri=https%3A%2F%2Ftest-uri.com&state=test-state&response_type=code"
    ),
    {
      method: "GET",
      headers: { "session-id": "test-session-id" },
      signal: expect.any(AbortSignal),
    }
  );
  expect(response.redirect_uri).toEqual("https://test-uri.com/");
  expect(response.state).toEqual("test-state");
  expect(response.authorizationCode).toBeUndefined();
});

it("should throw an error when the call to the /api/authorisation returns an empty state object", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
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
      authorizationCode: { value: "test-auth-code" },
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
      authorizationCode: { value: "test-auth-code" },
      state: {},
    },
    { status: 500 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Authorize endpoint returned an error response");
});

it("should throw an error if the authorization endpoint returns a missing redirection URI", async () => {
  const mockResponse = Response.json(
    {
      authorizationCode: { value: "test-auth-code" },
      state: { value: "test-state" },
    },
    { status: 200 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Invalid response properties received from authorization endpoint");
});

it("should throw an error if the authorization endpoint returns a missing auth code", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      state: { value: "test-state" },
    },
    { status: 200 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Invalid response properties received from authorization endpoint");
});

it("should throw an error if the authorization endpoint returns a missing state", async () => {
  const mockResponse = Response.json(
    {
      redirectionURI: "https://api.example.com",
      authorizationCode: { value: "test-auth-code" },
    },
    { status: 200 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(
    getAuthorizationCode("test-client-id", "https://test-uri.com", "test-state", "test-session-id")
  ).rejects.toThrow("Invalid response properties received from authorization endpoint");
});

it("should throw an error if the session endpoint returns a missing session id", async () => {
  const mockResponse = Response.json(
    {
      state: "test-state",
      redirect_uri: "https://api.example.com",
    },
    { status: 201 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(callSessionApi("test-client-id", "test-request")).rejects.toThrow(
    "Invalid response properties received from session endpoint"
  );
});

it("should throw an error if the session endpoint returns a missing state", async () => {
  const mockResponse = Response.json(
    {
      session_id: "test-session-id",
      redirect_uri: "https://api.example.com",
    },
    { status: 201 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(callSessionApi("test-client-id", "test-request")).rejects.toThrow(
    "Invalid response properties received from session endpoint"
  );
});

it("should throw an error if the session endpoint returns a missing redirect URI", async () => {
  const mockResponse = Response.json(
    {
      state: "test-state",
      session_id: "test-session-id",
    },
    { status: 201 }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  await expect(callSessionApi("test-client-id", "test-request")).rejects.toThrow(
    "Invalid response properties received from session endpoint"
  );
});
