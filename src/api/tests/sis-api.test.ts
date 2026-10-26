import { it, expect, vi, beforeEach } from "vitest";
import {
  redirectToClient,
  redirectToConfirmDetails,
  redirectToErrorPage,
  redirectToOauthCallBack,
  redirectToSessionExpiredPage,
  redirectToErrorPageExpress,
  redirectToBadRequestExpress,
  redirectToOauthCallBackExpress,
  redirectToSessionExpiredPageExpress,
  redirectToConfirmDetailsExpress,
} from "../sis-api.js";
import { getRequiredEnvironment } from "../../configuration/get-required-environment.js";
import { Response } from "express";

vi.mock("../../configuration/get-required-environment.js");

beforeEach(() => {
  vi.mocked(getRequiredEnvironment).mockReturnValue("test.com");
});

it("should redirect to error page", async () => {
  const result = redirectToErrorPage();
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/error/unrecoverable",
    },
    body: "",
  });
});

it("should redirect to session expired page", async () => {
  const result = redirectToSessionExpiredPage();
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/error/session-expired",
    },
    body: "",
  });
});

it("should redirect to confirm details page with cookie", async () => {
  const result = redirectToConfirmDetails(
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
  const result = redirectToConfirmDetails();
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://test.com/confirm-details",
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
  const result = redirectToClient(
    "https://api.example.com",
    "test-state",
    undefined,
    "record_unavailable",
    "access_denied"
  );
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
  const result = redirectToOauthCallBack();
  expect(result).toEqual({
    statusCode: 302,
    headers: {
      Location: "https://api.example.com/oauth2/callback",
    },
    body: "",
  });
});

it("should redirect to error page (express)", () => {
  const response = { redirect: vi.fn() } as unknown as Response;

  redirectToErrorPageExpress(response);

  expect(getRequiredEnvironment).toHaveBeenCalledWith("DOMAIN_NAME");
  expect(response.redirect).toHaveBeenCalledWith("https://test.com/error/unrecoverable");
  expect(response.redirect).toHaveBeenCalledTimes(1);
});

it("should redirect to session expired page (express)", () => {
  const response = { redirect: vi.fn() } as unknown as Response;

  redirectToSessionExpiredPageExpress(response);

  expect(getRequiredEnvironment).toHaveBeenCalledWith("DOMAIN_NAME");
  expect(response.redirect).toHaveBeenCalledWith("https://test.com/error/session-expired");
  expect(response.redirect).toHaveBeenCalledTimes(1);
});

it("should redirect to bad request page (express)", () => {
  const response = { redirect: vi.fn() } as unknown as Response;

  redirectToBadRequestExpress(response);

  expect(getRequiredEnvironment).toHaveBeenCalledWith("DOMAIN_NAME");
  expect(response.redirect).toHaveBeenCalledWith("https://test.com/error/bad-request");
  expect(response.redirect).toHaveBeenCalledTimes(1);
});

it("should redirect to oauth callback (express)", () => {
  process.env.PUBLIC_API = "api.example.com";
  const response = { redirect: vi.fn() } as unknown as Response;

  redirectToOauthCallBackExpress(response);

  expect(response.redirect).toHaveBeenCalledWith("https://api.example.com/oauth2/callback");
  expect(response.redirect).toHaveBeenCalledTimes(1);
});

it("should set session cookie and redirect to confirm details (express)", () => {
  const redirect = vi.fn();
  const response = { cookie: vi.fn().mockReturnThis(), redirect } as unknown as Response;

  redirectToConfirmDetailsExpress(response, "test-session-id");

  expect(response.cookie).toHaveBeenCalledWith("identity_reuse_service_session", "test-session-id", {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  expect(response.redirect).toHaveBeenCalledTimes(1);
});
