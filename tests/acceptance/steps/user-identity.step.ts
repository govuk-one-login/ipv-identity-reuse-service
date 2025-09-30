import { Given, When, Then } from "@cucumber/cucumber";
import { sisPostUserIdentity } from "./utils/sis-api";
import { getBearerToken } from "./utils/get-bearer-token";
import assert from "assert";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPostIdentity } from "./utils/evcs-api";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { getDefaultStoredIdentityHeader, sign } from "./utils/jwt-utils";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

Given<WorldDefinition>("I have a user without a stored identity", async function () {
  this.bearerToken = await getBearerToken(this.userId);
});

Given<WorldDefinition>(
  "I have a user with a Stored Identity, with Vot {string} and {int} credentials",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function (vot: string, credentials: number) {
    // TODO: credentials parameter to be implemented in SPT-1629
    const header: JWTHeaderParameters = getDefaultStoredIdentityHeader();
    const payload: JWTPayload = {
      sub: this.userId,
      iss: "http://api.example.com",
      vot,
    };
    const jwt = sign(header, payload);

    const result = await evcsPostIdentity(
      this,
      this.userId,
      {
        vot: vot as never as IdentityVectorOfTrust,
        jwt,
      },
      this.bearerToken || ""
    );

    assert.equal(result.status, 202);

    this.bearerToken = await getBearerToken(this.userId);
  }
);

When<WorldDefinition>("I make a request for the users identity with a VTR {string}", async function (vtr: string) {
  this.userIdentityPostResponse = await sisPostUserIdentity(
    {
      vtr: vtr.split(",").map((s) => s.trim()),
      govukSigninJourneyId: this.govukSigninJourneyId,
    },
    this.bearerToken
  );
});

When<WorldDefinition>("I make a request for the users identity with invalid Authorization header", async function () {
  this.userIdentityPostResponse = await sisPostUserIdentity(
    {
      vtr: this.requestedVtr,
      govukSigninJourneyId: this.govukSigninJourneyId,
    },
    "Blah blah"
  );
});

When<WorldDefinition>("I make a request for the users identity without Authorization header", async function () {
  this.userIdentityPostResponse = await sisPostUserIdentity({
    vtr: this.requestedVtr,
    govukSigninJourneyId: this.govukSigninJourneyId,
  });
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
  assert.deepEqual(
    {
      ...this.userIdentityPostResponse?.body,
      content: {
        ...this.userIdentityPostResponse?.body?.content,
        vot: undefined,
      },
      vot: undefined,
      isValid: undefined,
    },
    {
      content: {
        sub: this.userId,
        iss: "http://api.example.com",
        vot: undefined,
      },
      vot: undefined,
      isValid: undefined,
      expired: false,
      kidValid: true,
      signatureValid: true,
    }
  );
});

Then("the stored identity content.vot should be {string}", function (vot: string) {
  assert.equal(this.userIdentityPostResponse?.body?.content?.vot, vot);
});

Then("the stored identity vot should be {string}", function (vot: string) {
  assert.equal(this.userIdentityPostResponse?.body?.vot, vot);
});

Then("the stored identity isValid field is {boolean}", function (isValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.isValid, isValid);
});

Then<WorldDefinition>("the stored credentials should be returned", function () {
  // TODO: To be implemented in SPT-1629
});
