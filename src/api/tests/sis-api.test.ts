import { it, expect } from "vitest";
import { redirectToClient, redirectToConfirmDetails, redirectToErrorPage } from "../sis-api.js";

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
  const result = redirectToConfirmDetails(
    "test.com",
    "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax"
  );
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details",
      "Set-Cookie": "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax",
    },
    body: "",
  });
});

it("should redirect to confirm details page", async () => {
  const result = redirectToConfirmDetails("test.com");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details",
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
