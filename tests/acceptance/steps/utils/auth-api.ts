import { getCloudFormationOutput, CloudFormationOutputs } from "./cloudformation";
import request from "supertest";

export const AuthorizationResponseType = {
  code: "code",
} as const;

export type AuthorizationParameters = {
  response_type: keyof typeof AuthorizationResponseType;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state: string;
};

export type RedirectResponse = {
  origin: string;
};

export type AuthorizationResponse = {
  origin: string;
  code: string | null;
  state: string | null;
};

export type OAuthBadRequest = {
  error: string;
  error_description: string;
};

export const TokenGrantType = {
  AuthorizationCode: "authorization_code",
} as const;

export type TokenRequest = {
  grant_type: string;
  code: string;
};

export type TokenResponse = {
  access_token: string;
  scope: string;
  token_type: string;
  expires_in: number;
};

export type AwsError = {
  message: string;
};

export const isTokenResponse = (response: unknown): response is TokenResponse => {
  return (
    !!response &&
    typeof response === "object" &&
    "access_token" in response &&
    "token_type" in response &&
    "expires_in" in response
  );
};

export const isAwsError = (response: unknown): response is AwsError => {
  return !!response && typeof response === "object" && "message" in response;
};

export const isRedirectResponse = (response: unknown): response is RedirectResponse =>
  !!response && typeof response === "object" && "origin" in response;

export const isAuthorizationResponse = (response: unknown): response is AuthorizationResponse =>
  !!response && typeof response === "object" && "origin" in response && "code" in response && "state" in response;

export const authorize = async (parameters: AuthorizationParameters): Promise<RedirectResponse | OAuthBadRequest> => {
  const publicApi = await getCloudFormationOutput(CloudFormationOutputs.SisPublicApi);

  const response = await request(publicApi).get("/authorize").query(parameters).send();
  if (isAwsError(response.body)) {
    return { error: "error", error_description: response.body.message };
  }

  if (response.statusCode === 302) {
    const { origin } = new URL(response.header["location"]);
    return {
      origin,
    };
  }

  return response.body;
};

export const token = async (parameters: TokenRequest): Promise<TokenResponse | OAuthBadRequest> => {
  const privateApi = await getCloudFormationOutput(CloudFormationOutputs.SisPrivateApiAcceptanceTest);

  const response = await request(privateApi)
    .post("/token")
    .set("content-type", "application/x-www-form-urlencoded")
    .send(parameters);
  if (isAwsError(response.body)) {
    return { error: "error", error_description: response.body.message };
  }

  return response.body;
};

export const confirmDetailsSubmission = async (
  redirectUri: string,
  state: string
): Promise<AuthorizationResponse | OAuthBadRequest> => {
  const publicApi = await getCloudFormationOutput(CloudFormationOutputs.SisPublicApi);

  const response = await request(publicApi)
    .post("/confirm-details")
    .set("content-type", "application/x-www-form-urlencoded")
    .send({ redirectUri, state });

  if (response.statusCode === 302) {
    const { origin, search } = new URL(response.header["location"]);
    return {
      origin,
      code: new URLSearchParams(search).get("code"),
      state: new URLSearchParams(search).get("state"),
    };
  }

  return { error: "error", error_description: `Expected 302 but got ${response.statusCode}` };
};
