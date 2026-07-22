import { it, expect } from "vitest";
import { redirectToClient, redirectToConfirmDetails, redirectToErrorPage } from "../sis-redirect-service";

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
    "test-state",
    "https://api.example.com",
    "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax"
  );
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fapi.example.com",
      "Set-Cookie": "identity_reuse_service_session=test-session-id; Path=/; Secure; HttpOnly; SameSite=Lax",
    },
    body: "",
  });
});

it("should redirect to confirm details page", async () => {
  const result = redirectToConfirmDetails("test.com", "test-state", "https://api.example.com");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fapi.example.com",
    },
    body: "",
  });
});

it("should redirect to the client page", async () => {
  const result = redirectToClient("https://api.example.com", "test-state", "test-auth-code");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
    body: "",
  });
});

it("should redirect to the client page with an error", async () => {
  const result = redirectToClient("https://api.example.com", "test-state");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?error=access_denied&state=test-state",
    },
    body: "",
  });
});
