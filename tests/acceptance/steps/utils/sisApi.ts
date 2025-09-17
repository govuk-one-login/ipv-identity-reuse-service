import request from "supertest";
import type { Response } from "superagent";

export const SisEndPoints = {
  BaseUrl:
    process.env.TEST_ENVIRONMENT === "dev" ? process.env.CFN_RegionalApiEndpoint : process.env.CFN_PrivateApiEndpoint,
  UserIdentityEndpoint: "/user-identity",
  BaseSecretName:
    process.env.TEST_ENVIRONMENT === "dev"
      ? `/${process.env.SAM_STACK_NAME}/Config/API/Key/`
      : `/ipv-identity-reuse-service/Config/API/Key/`,
} as const;

export async function sisPostUserIdentity<T>(data: T, bearerToken?: string): Promise<Response> {
  const requestOperation = request(SisEndPoints.BaseUrl as string)
    .post(SisEndPoints.UserIdentityEndpoint)
    .send(JSON.stringify(data))
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");

  if (bearerToken) {
    requestOperation.set("Authorization", bearerToken);
  }

  return await requestOperation;
}
