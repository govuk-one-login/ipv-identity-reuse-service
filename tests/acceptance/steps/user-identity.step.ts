import { Given, When, Then } from "@cucumber/cucumber";
import { sisPostUserIdentity } from "./utils/sisApi";
import { getBearerToken } from "./utils/get-bearer-token";
import assert from "assert";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPostIdentity } from "./utils/evcsApi";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { getDefaultStoredIdentityHeader, sign } from "./utils/jwtUtils";

Given<WorldDefinition>("I have a user without a stored identity", async function () {
  this.bearerToken = await getBearerToken(this.userId);
});

Given<WorldDefinition>(
  "I have a user with a Stored Identity and {int} credentials",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function (credentials: number) {
    // TODO: credentials parameter to be implemented in SPT-1629
    const header: JWTHeaderParameters = getDefaultStoredIdentityHeader();
    const payload: JWTPayload = {
      sub: this.userId,
      iss: "http://api.example.com",
      vot: "P1",
    };
    const jwt = sign(header, payload);

    const result = await evcsPostIdentity(
      this,
      this.userId,
      {
        vot: "P1",
        jwt,
      },
      this.bearerToken || ""
    );

    assert.equal(result.status, 202);

    this.bearerToken = await getBearerToken(this.userId);
  }
);

When<WorldDefinition>("I make a request for the users identity", async function () {
  this.userIdentityPostResponse = await sisPostUserIdentity({}, this.bearerToken);
});

When<WorldDefinition>("I make a request for the users identity with invalid Authorization header", async function () {
  this.userIdentityPostResponse = await sisPostUserIdentity({}, "Blah blah");
});

When<WorldDefinition>("I make a request for the users identity without Authorization header", async function () {
  this.userIdentityPostResponse = await sisPostUserIdentity({});
});

Then<WorldDefinition>("the status code should be {int}", function (statusCode: number) {
  assert.ok(this.userIdentityPostResponse);
  assert.equal(this.userIdentityPostResponse.statusCode, statusCode);
});

Then<WorldDefinition>("the error should be {string}", function (error: string) {
  assert.ok(this.userIdentityPostResponse);
  assert.equal(this.userIdentityPostResponse.body.error, error);
});

Then<WorldDefinition>("the error description should be {string}", function (errorDescription: string) {
  assert.ok(this.userIdentityPostResponse);
  assert.equal(this.userIdentityPostResponse.body.error_description, errorDescription);
});

Then<WorldDefinition>("the stored identity should be returned", function () {
  assert.deepEqual(this.userIdentityPostResponse?.body, {
    content: {
      sub: this.userId,
      iss: "http://api.example.com",
      vot: "P1",
    },
    vot: "P1",
    isValid: true,
    expired: false,
    kidValid: true,
    signatureValid: true,
  });
});

Then<WorldDefinition>("the stored credentials should be returned", function () {
  // TODO: To be implemented in SPT-1629
});
