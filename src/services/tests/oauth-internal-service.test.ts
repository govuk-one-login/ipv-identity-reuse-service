import { afterEach, beforeEach, expect, it, vitest } from "vitest";
import { callSessionApi, getAuthorizationCode } from "../oauth-internal-service";

beforeEach(() => {
  vitest.clearAllMocks();
});

afterEach(() => {
  vitest.restoreAllMocks();
});

it("should call the /api/session fetch and return the raw response", async () => {
  process.env.OAUTH_INTERNAL_API_URL = "https://test.com";

  const mockResponse = Response.json(
    { state: "test-state", redirect_uri: "https://test-uri.com", session_id: "test-session-id" },
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

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

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toEqual({ state: "test-state", redirect_uri: "https://test-uri.com", session_id: "test-session-id" });
});

it("should call the /api/authorisation fetch and return the raw response", async () => {
  process.env.OAUTH_INTERNAL_API = "https://test.com";

  const mockResponse = Response.json(
    { state: "test-state", redirect_uri: "https://test-uri.com", session_id: "test-session-id" },
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );

  vitest.stubGlobal("fetch", vitest.fn().mockResolvedValueOnce(mockResponse));

  const response = await getAuthorizationCode(
    { client_id: "test-client-id", redirect_uri: "https:test-uri.com", state: "test-state", response_type: "code" },
    "test-session-id"
  );

  expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  expect(globalThis.fetch).toHaveBeenCalledWith(
    new URL(
      "https://test.com/api/authorization?client_id=test-client-id&redirect_uri=https%3Atest-uri.com&state=test-state&response_type=code"
    ),
    {
      method: "GET",
      headers: { "session-id": "test-session-id" },
    }
  );

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toEqual({ state: "test-state", redirect_uri: "https://test-uri.com", session_id: "test-session-id" });
});
