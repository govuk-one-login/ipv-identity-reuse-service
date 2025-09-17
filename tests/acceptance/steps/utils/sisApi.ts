import request from "supertest";
import type { Response } from "superagent";
import { CloudFormationOutputs, getCloudFormationOutput } from "./cloudformation";

export async function sisPostUserIdentity<T>(data: T, bearerToken?: string): Promise<Response> {
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
