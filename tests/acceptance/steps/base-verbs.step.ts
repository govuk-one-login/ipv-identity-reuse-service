import { Given, setDefaultTimeout } from "@cucumber/cucumber";
import { getApiKey } from "./utils/get-api-key";
import request from "supertest";
import EndPoints from "./utils/endpoints";
import { Response } from "superagent";

export interface WorldDefinition {
  testUserId: string;
  apiKey?: string;
  afterKey?: string;
  userIdentityResponse?: Response;
  bearerToken?: string;
}

setDefaultTimeout(20000);

Given("I have the IPV Core API Key", async function (this: WorldDefinition) {
  this.apiKey = await getApiKey("IPV_CORE_KEY");
});

export async function postRequest<T>(world: WorldDefinition, path: string, data: T): Promise<Response> {
  return await request(EndPoints.BASE_URL as string)
    .post(path)
    .send(JSON.stringify(data))
    .set("Accept", "*/*")
    .set("x-api-key", world.apiKey || "")
    .set("Content-Type", "application/json");
}

export async function getRequest<T>(world: WorldDefinition, path: string, data?: T): Promise<Response> {
  return await request(EndPoints.BASE_URL as string)
    .get(path)
    .send(JSON.stringify(data))
    .set("Accept", "*/*")
    .set("x-api-key", world.apiKey || "")
    .set("Authorization", world.bearerToken || "")
    .set("Content-Type", "application/json");
}
