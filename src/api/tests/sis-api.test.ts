import { it, expect } from "vitest";
import {
  redirectToClient,
  redirectToConfirmDetails,
  redirectToErrorPage,
  redirectToOauthCallBack,
} from "../sis-api.js";

it("should redirect to error page", async () => {
  const result = redirectToErrorPage("test.com");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/error/unrecoverable",
    },
    body: "",
  });
});

it("should redirect to confirm details page with cookie", async () => {
  const result = redirectToConfirmDetails({
    domainName: "test.com",
    state: "test-state",
    redirectUri: "https://api.example.com",
    clientId: "test-client-id",
    cookie: "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax",
  });
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location:
        "https://test.com/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fapi.example.com&client_id=test-client-id",
      "Set-Cookie": "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax",
    },
    body: "",
  });
});

it("should redirect to confirm details page", async () => {
  const result = redirectToConfirmDetails({
    domainName: "test.com",
    state: "test-state",
    redirectUri: "https://api.example.com",
    clientId: "test-client-id",
  });
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location:
        "https://test.com/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fapi.example.com&client_id=test-client-id",
    },
    body: "",
  });
});

it("should redirect to the client page", async () => {
  const result = redirectToClient({
    redirectUri: "https://api.example.com",
    state: "test-state",
    authorizationCode: "test-auth-code",
  });
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
    body: "",
  });
});

it("should redirect to the client page with an error", async () => {
  const result = redirectToClient({
    redirectUri: "https://api.example.com",
    state: "test-state",
    errorDescription: "record_unavailable",
    error: "access_denied",
  });
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?error=access_denied&error_description=record_unavailable&state=test-state",
    },
    body: "",
  });
});

it("should redirect to oauth callback with query params", async () => {
  process.env.PUBLIC_API = "api.example.com";
  const result = redirectToOauthCallBack({
    redirectUri: "https://api.example.com",
    state: "test-state",
    clientId: "test-client-id",
  });
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location:
        "https://api.example.com/oauth2/callback?redirect_uri=https%3A%2F%2Fapi.example.com&state=test-state&client_id=test-client-id",
    },
    body: "",
  });
});
