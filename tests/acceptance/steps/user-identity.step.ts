import { Given, When, Then } from "@cucumber/cucumber";
import { sisPostUserIdentity } from "./utils/sis-api";
import { getBearerToken } from "./utils/get-bearer-token";
import assert from "assert";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPostCredentials, evcsPostIdentity } from "./utils/evcs-api";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { getDefaultStoredIdentityHeader, sign } from "./utils/jwt-utils";
import { IdentityCheckCredentialJWTClass, IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials";

Given<WorldDefinition>("a user has {int} CURRENT credentials stored", async function (credentials: number) {
  const header: JWTHeaderParameters = getDefaultStoredIdentityHeader();
  for (let i = 0; i < credentials; i++) {
    const credentialPayload: IdentityCheckCredentialJWTClass = {
      sub: this.userId,
      iss: "http://cri.example.com",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [],
      },
    };

    this.credentialJwts.push(sign(header, credentialPayload));
  }

  if (this.credentialJwts.length) {
    const result = await evcsPostCredentials(
      this.userId,
      this.credentialJwts.map((jwt) => {
        return { vc: jwt, state: "CURRENT" };
      })
    );

    assert.equal(result.status, 202);
  }
});

Given<WorldDefinition>("I have a user without a stored identity", async function () {
  this.bearerToken = await getBearerToken(this.userId);
});

Given<WorldDefinition>("the user has a stored identity, with VOT {string}", async function (vot: string) {
  const header: JWTHeaderParameters = getDefaultStoredIdentityHeader();
  const payload: JWTPayload = {
    sub: this.userId,
    iss: "http://api.example.com",
    credentials: this.credentialJwts.map((jwt) => jwt.split(".").at(-1)),
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
});

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
        credentials: this.credentialJwts.map((jwt) => jwt.split(".").at(-1)),
        vot: undefined,
      },
      vot: undefined,
      isValid: undefined,
      expired: true,
      kidValid: true,
      signatureValid: true,
    }
  );
});

Then("the stored identity content.vot should be {string}", function (vot: string) {
  assert.equal(this.userIdentityPostResponse?.body?.content?.vot, vot);
});

Then("the stored identity VOT should be {string}", function (vot: string) {
  assert.equal(this.userIdentityPostResponse?.body?.vot, vot);
});

Then("the stored identity isValid field is {boolean}", function (isValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.isValid, isValid);
});

Then<WorldDefinition>("the stored credentials should be returned", function () {
  // TODO: To be implemented in SPT-1629
});
