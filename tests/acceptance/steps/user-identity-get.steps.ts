import { Given, Then } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step";
import { sisGetUserIdentityHandler } from "./utils/sis-api";
import assert from "node:assert";

Given<WorldDefinition>("I make a request for the user identity without Authorization header", async function () {
  this.userIdentityPostResponse = await sisGetUserIdentityHandler();
});

Given<WorldDefinition>(
  "I make a request for the user identity with Authorization header without a Bearer token",
  async function () {
    this.userIdentityPostResponse = await sisGetUserIdentityHandler("abcd1234", "Token");
  }
);

Given<WorldDefinition>(
  "I make a request for the user identity with Authorization header with invalid Bearer token",
  async function () {
    this.userIdentityPostResponse = await sisGetUserIdentityHandler("this-token-does-not-exist");
  }
);

Then<WorldDefinition>("the message should be {string}", function (error: string) {
  assert.ok(this.userIdentityPostResponse);
  assert.equal(this.userIdentityPostResponse.body.message, error);
});
