import { it, expect } from "vitest";
import {
  redirectToClient,
  redirectToClientWithError,
  redirectToConfirmDetails,
  redirectToConfirmDetailsWithCookie,
  redirectToErrorPage,
} from "../sis-redirect-service";

it("should redirect to error page", async () => {
  const result = await redirectToErrorPage("test.com");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/error/unrecoverable",
    },
    body: "",
  });
});

it("should redirect to confirm details page with cookie", async () => {
  const result = await redirectToConfirmDetailsWithCookie("test.com", {
    state: "test-state",
    redirect_uri: "https://api.example.com",
    session_id: "test-session-id",
  });
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
  const result = await redirectToConfirmDetails("test.com", "test-state", "https://api.example.com");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details?state=test-state&redirect_uri=https%3A%2F%2Fapi.example.com",
    },
    body: "",
  });
});

it("should redirect to the client page", async () => {
  const mockResponse = Response.json({
    redirectionURI: "https://api.example.com",
    authorizationCode: { value: "test-auth-code" },
    state: { value: "test-state" },
  });

  const result = await redirectToClient(mockResponse, "");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?code=test-auth-code&state=test-state",
    },
    body: "",
  });
});

it("should redirect to the client page with an error", async () => {
  const result = await redirectToClientWithError("https://api.example.com", "test-state");
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/?error=access_denied&state=test-state",
    },
    body: "",
  });
});
