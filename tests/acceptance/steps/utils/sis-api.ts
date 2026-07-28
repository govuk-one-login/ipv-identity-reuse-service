import request from "supertest";
import type { Response } from "superagent";
import { CloudFormationOutputs, getCloudFormationOutput } from "./cloudformation";

export type SisPostBody = {
  govukSigninJourneyId: string;
  vtr: string[];
};

export async function sisPostUserIdentity(data: SisPostBody, bearerToken?: string): Promise<Response> {
  const requestOperation = request(await getCloudFormationOutput(CloudFormationOutputs.ApiEndpoint))
    .post("/user-identity")
    .send(JSON.stringify(data))
    .set("Accept", "*/*")
    .set("Content-Type", "application/json");

  if (bearerToken) {
    requestOperation.set("Authorization", bearerToken);
  }

  return await requestOperation;
}

export async function sisGetUserIdentityHandler(bearerToken?: string, authType: string = "Bearer"): Promise<Response> {
  const requestOperation = request(await getCloudFormationOutput(CloudFormationOutputs.SisPrivateApiAcceptanceTest))
    .get("/user-identity")
    .set("Accept", "*/*");

  if (bearerToken) {
    requestOperation.set("Authorization", `${authType} ${bearerToken}`);
  }

  return await requestOperation;
}
