import { Then } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step.js";
import assert from "node:assert";
import { IdentityVectorOfTrust } from "@govuk-one-login/data-vocab/credentials.js";
import { KENNETH_DECERQUEIRA } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/names";
import { KENNETH_DECERQUEIRA_BIRTH_DATE } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/birthdates";
import { KENNETH_DECERQUERIA_ADDRESS } from "@govuk-one-login/ipv-trust-and-reuse-test-credentials/addresses";

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
  // Build expected credentials array from all credentials
  const expectedCredentials = this.credentialJwts.map((jwt) => jwt.split(".").at(-1));

  assert.deepEqual(
    {
      ...this.userIdentityPostResponse?.body,
      content: {
        ...this.userIdentityPostResponse?.body?.content,
        vot: undefined,
      },
      vot: undefined,
      isValid: undefined,
      expired: undefined,
    },
    {
      content: {
        sub: this.userId,
        iss: "https://api.example.com",
        credentials: expectedCredentials,
        claims: {
          "https://vocab.account.gov.uk/v1/coreIdentity": {
            birthDate: [KENNETH_DECERQUEIRA_BIRTH_DATE],
            name: [KENNETH_DECERQUEIRA],
          },
          "https://vocab.account.gov.uk/v1/address": [KENNETH_DECERQUERIA_ADDRESS],
        },
        vot: undefined,
        vtm: "https://oidc.account.gov.uk/trustmark",
      },
      vot: undefined,
      isValid: undefined,
      expired: undefined,
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

Then("the stored identity expired field is {boolean}", function (isExpired: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.expired, isExpired);
});

Then("the stored identity should have VOT {string}", function (vot: IdentityVectorOfTrust) {
  assert.equal(this.userIdentityPostResponse?.body?.content.vot, vot);
});

Then("the stored identity should have max_vot", function () {
  assert.equal(this.userIdentityPostResponse?.body?.content.max_vot, undefined);
  assert.equal(this.userIdentityPostResponse?.body?.max_vot, undefined);
});

Then<WorldDefinition>("the untrusted stored identity should be returned", function () {
  assert.deepEqual(
    {
      ...this.userIdentityPostResponse?.body,
      content: {
        ...this.userIdentityPostResponse?.body?.content,
        vot: undefined,
      },
      vot: undefined,
      isValid: undefined,
      kidValid: undefined,
      signatureValid: undefined,
    },
    {
      content: {
        sub: this.userId,
        iss: "http://api.example.com",
        vot: undefined,
        vtm: "https://oidc.account.gov.uk/trustmark",
      },
      vot: undefined,
      isValid: undefined,
      expired: true,
      kidValid: undefined,
      signatureValid: undefined,
    }
  );
});

Then("the stored identity kidValid field is {boolean}", function (kidValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.kidValid, kidValid);
});

Then("the stored identity signatureValid field is {boolean}", function (signatureValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.signatureValid, signatureValid);
});
