import { getCloudFormationOutput, CloudFormationOutputs } from "./cloudformation";
import request from "supertest";

export const AuthorizationResponseType = {
  code: "code",
} as const;

export type AuthorizationParams = {
  response_type: keyof typeof AuthorizationResponseType;
  client_id: string;
  redirect_uri: string;
  scope?: string;
  state?: string;
};

export type AuthorizationResponse = {
  code: string;
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

export const isOAuthBadRequest = (response: unknown): response is OAuthBadRequest => {
  return !!response && typeof response === "object" && "error" in response && "error_description" in response;
};

export const isAuthorizationResponse = (response: unknown): response is AuthorizationResponse => {
  return !!response && typeof response === "object" && "code" in response;
};

export const isTokenResponse = (response: unknown): response is TokenResponse => {
  return (
    !!response &&
    typeof response === "object" &&
    "access_token" in response &&
    "scope" in response &&
    "token_type" in response &&
    "expires_in" in response
  );
};

export const isAwsError = (response: unknown): response is AwsError => {
  return !!response && typeof response === "object" && "message" in response;
};

export const authorize = async (params: AuthorizationParams): Promise<AuthorizationResponse | OAuthBadRequest> => {
  const publicApi = await getCloudFormationOutput(CloudFormationOutputs.SisPublicApi);

  const response = await request(publicApi).get("/authorize").query(params).send();
  if (isAwsError(response.body)) {
    return { error: "error", error_description: response.body.message };
  }

  const code = /https:.*code=(.*)/.exec(response.header["location"]);
  if (code) {
    return { code: code[1] };
  } else {
    return { error: "invalid", error_description: "Invalid code returned" };
  }
};

export const token = async (params: TokenRequest): Promise<TokenResponse | OAuthBadRequest> => {
  const privateApi = await getCloudFormationOutput(CloudFormationOutputs.SisPrivateApiAcceptanceTest);

  const response = await request(privateApi)
    .post("/token")
    .set("content-type", "application/x-www-form-urlencoded")
    .send(params);
  if (isAwsError(response.body)) {
    return { error: "error", error_description: response.body.message };
  }

  return response.body;
};
