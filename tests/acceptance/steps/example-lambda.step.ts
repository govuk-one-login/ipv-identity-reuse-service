import { Given, When, Then, Before } from "@cucumber/cucumber";
import { type InvokeCommandOutput } from "@aws-sdk/client-lambda";
import assert from "node:assert";
import { LambdaTestClient } from "./utils/lambda-test-client";

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

Given<TestWorld>("I have the Lambda with resource name {string}", async function (lambdaName: string) {
  this.lambdaPhysicalId = await this.lambdaTest.getPhysicalResourceId(lambdaName);
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

export {};
