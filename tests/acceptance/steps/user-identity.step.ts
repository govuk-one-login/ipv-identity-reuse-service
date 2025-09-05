import { Given, When, Then, Before } from "@cucumber/cucumber";
import { type InvokeCommandOutput } from "@aws-sdk/client-lambda";
import assert from "node:assert";
import { UserIdentityInput } from "../../../src/types/interfaces";
import { HttpCodesEnum } from "../../../src/types/constants";
import request from "supertest";
import { LambdaTestClient } from "./utils/lambda-test-client";
import EndPoints from "./utils/endpoints";
import { getApiKey } from "./utils/get-api-key";
interface TestWorld {
  lambdaTest: LambdaTestClient;
  lambdaPhysicalId?: string;
  lambdaResponse?: InvokeCommandOutput;
}
const userIdentityInput: UserIdentityInput = {
  govukSigninJourneyId: "j8mMnXW_rP6JqNXBKKf8xsGXttk121",
  vtr: ["P1", "P3"],
};
Before<TestWorld>(function () {
  const stackName = process.env.SAM_STACK_NAME;
  if (typeof stackName != "string" || stackName.length === 0) {
    throw new Error("Environment variable SAM_STACK_NAME not defined");
  }

  this.lambdaTest = new LambdaTestClient(stackName);
});
type WorldDefinition = {
  testUserId: string;
  userIdentityPOSTResponse: import("superagent/lib/node/response.js");
};

Given<TestWorld>("I have the Lambda with resource name {string}", async function (lambdaName: string) {
  this.lambdaPhysicalId = await this.lambdaTest.getPhysicalResourceId(lambdaName);
});
Given("I send a POST request with input value", async function (this: WorldDefinition) {
  this.userIdentityPOSTResponse = await request(EndPoints.BASE_URL as string)
    .post(EndPoints.PATH_USER_IDENTITY)
    .send(userIdentityInput)
    .set("x-api-key", await getApiKey())
    .set("authorization", "Bearer 123")
    .set("Content-Type", "application/json")
    .set("Accept", "*/*");
});
Given("I send a POST request with malformed data", async function (this: WorldDefinition) {
  this.userIdentityPOSTResponse = await request(EndPoints.BASE_URL as string)
    .post(EndPoints.PATH_USER_IDENTITY)
    .send("")
    .set("authorization", "a-dummy-access-token")
    .set("x-api-key", await getApiKey())
    .set("Content-Type", "application/json")
    .set("Accept", "*/*");
});
Given("I send a POST request without authorization header", async function (this: WorldDefinition) {
  this.userIdentityPOSTResponse = await request(EndPoints.BASE_URL as string)
    .post(EndPoints.PATH_USER_IDENTITY)
    .send(userIdentityInput)
    .set("x-api-key", await getApiKey())
    .set("Content-Type", "application/json")
    .set("Accept", "*/*");
});
Then("I should receive a success response", async function () {
  assert.equal(this.userIdentityPOSTResponse.statusCode, HttpCodesEnum.OK);
});
Then("I should receive a Bad Request", async function () {
  assert.equal(this.userIdentityPOSTResponse.status, HttpCodesEnum.BAD_REQUEST);
});

Then("I should receive Unauthorized", async function () {
  assert.equal(this.userIdentityPOSTResponse.status, HttpCodesEnum.UNAUTHORIZED);
});
When<TestWorld>("I call the Lambda", async function () {
  if (!this.lambdaPhysicalId) {
    throw new Error("Lambda Physical Id is not defined");
  }
  this.lambdaResponse = await this.lambdaTest.callLambda(this.lambdaPhysicalId, '{"Records":[]}');
});

Then<TestWorld>("it will return null", function () {
  assert.equal(this.lambdaResponse?.StatusCode, 200);
  assert.equal(new TextDecoder().decode(this.lambdaResponse?.Payload), "null");
});
