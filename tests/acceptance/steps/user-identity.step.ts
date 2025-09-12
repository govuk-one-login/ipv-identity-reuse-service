import { Given, When, Then, Before } from "@cucumber/cucumber";
import { type InvokeCommandOutput } from "@aws-sdk/client-lambda";
import assert from "node:assert";
import { StoredIdentityResponse } from "../../../src/types/interfaces";
import request from "supertest";
import { LambdaTestClient } from "./utils/lambda-test-client";
import EndPoints from "./utils/endpoints";
import { getApiKey } from "./utils/get-api-key";
import { getBearerToken } from "./utils/get-bearer-token";
interface TestWorld {
  lambdaTest: LambdaTestClient;
  lambdaPhysicalId?: string;
  lambdaResponse?: InvokeCommandOutput;
}

Before<TestWorld>(function () {
  const stackName = process.env.SAM_STACK_NAME;
  if (typeof stackName != "string" || stackName.length === 0) {
    throw new Error("Environment variable SAM_STACK_NAME not defined");
  }

  this.lambdaTest = new LambdaTestClient(stackName);
});
type WorldDefinition = {
  bearerToken: string;
  userIdentityPOSTResponse: import("superagent/lib/node/response.js");
  userIdentityGETResponse: import("superagent/lib/node/response.js");
};

Given<TestWorld>("I have the Lambda with resource name {string}", async function (lambdaName: string) {
  this.lambdaPhysicalId = await this.lambdaTest.getPhysicalResourceId(lambdaName);
});

Given("I send a POST request", async function (this: WorldDefinition) {
  this.userIdentityPOSTResponse = await request(EndPoints.BASE_URL as string)
    .post(EndPoints.PATH_USER_IDENTITY)
    .set("x-api-key", await getApiKey())
    .set("authorization", this.bearerToken)
    .set("Content-Type", "application/json")
    .set("Accept", "*/*");
});

Given(/a (.*) bearer token/, async function (this: WorldDefinition, status: string) {
  let token: string;

  switch (status) {
    case "valid":
      token = await getBearerToken("TEST_USER");
      break;
    case "bad":
      token = "Bearer a.bad.jwt";
      break;
    case "absentee":
      token = await getBearerToken("NO_USER");
      break;
    default:
      throw new Error("Unsupported token type.");
  }

  this.bearerToken = token;
});

Then("the status code should be {int}", async function (statusCode: number) {
  assert.equal(this.userIdentityPOSTResponse.statusCode, statusCode);
});

Then("The stored identity should be returned", function (this: WorldDefinition) {
  JSON.parse(this.userIdentityPOSTResponse.body) satisfies StoredIdentityResponse;
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
