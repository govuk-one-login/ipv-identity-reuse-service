import { Given, When, Then } from "@cucumber/cucumber";
import { sisPostUserIdentity } from "./utils/sis-api";
import { getBearerToken } from "./utils/get-bearer-token";
import assert from "assert";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPatchCredentials, evcsPostCredentials, evcsPostIdentity } from "./utils/evcs-api";
import { JWTHeaderParameters, JWTPayload } from "jose";
import { IdentityVectorOfTrust, IdentityCheckCredentialJWTClass } from "@govuk-one-login/data-vocab/credentials";
import { getDefaultStoredIdentityHeader, sign } from "../../../shared-test/jwt-utils";
import { renderDid } from "../../../shared-test/string-utils";

Given<WorldDefinition>("a user has {int} CURRENT credentials stored", async function (credentials: number) {
  this.credentialJwts = await createAndPostCredentials(credentials, this.userId);
});

Given<WorldDefinition>("an extra CURRENT credential is stored for the user", async function () {
  await createAndPostCredentials(1, this.userId);
});

Given<WorldDefinition>("an existing CURRENT credential is marked as HISTORIC for the user", async function () {
  if (!this.credentialJwts?.length) {
    throw new Error("The step expects to be able to access credentials from the WorldDefinition");
  }

  const signatureOfCredentialToUpdate = this.credentialJwts!.at(0)?.split(".").at(-1) as string;
  await evcsPatchCredentials(this.userId, [{ signature: signatureOfCredentialToUpdate, state: "HISTORIC" }]);
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
  const jwt = await sign(header, payload);

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

Given<WorldDefinition>(
  "I have a user with a Stored Identity, with VOT {string} and {int} credentials",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function (vot: string, credentials: number) {
    // TODO: credentials parameter to be implemented in SPT-1629
    const header: JWTHeaderParameters = getDefaultStoredIdentityHeader(
      "ES256",
      renderDid(this.testDidController, this.keyId)
    );
    const payload: JWTPayload = {
      sub: this.userId,
      iss: "http://api.example.com",
      vot,
    };
    const jwt = await sign(header, payload, true);

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

Given<WorldDefinition>("I have a user with a Stored Identity, and an invalid signature", async function () {
  const header: JWTHeaderParameters = getDefaultStoredIdentityHeader(
    "ES256",
    renderDid(this.testDidController, this.keyId)
  );
  const payload: JWTPayload = {
    sub: this.userId,
    iss: "http://api.example.com",
    vot: "P2",
  };
  const jwt = await sign(header, payload);
  const result = await evcsPostIdentity(
    this,
    this.userId,
    {
      vot: "P2",
      jwt,
    },
    this.bearerToken || ""
  );

  assert.equal(result.status, 202);

  this.bearerToken = await getBearerToken(this.userId);
});

Given<WorldDefinition>(
  "I have a user with a Stored Identity, with {string} kid",

  async function (status: string) {
    // TODO: credentials parameter to be implemented in SPT-1629
    let kid: string;
    if (status == "no") {
      kid = "";
    } else if (status == "invalid") {
      kid = "invalid_kid";
    } else if (status == "forbidden") {
      kid = "did:web:forbidden.controller#f5fe5d2a-9eb6-4819-8c46-723e3a21565a";
    } else {
      throw new Error("Invalid kid config");
    }

    const header: JWTHeaderParameters = getDefaultStoredIdentityHeader("ES256", kid);
    const payload: JWTPayload = {
      sub: this.userId,
      iss: "http://api.example.com",
      vot: "P2",
    };
    const jwt = await sign(header, payload, true);

    const result = await evcsPostIdentity(
      this,
      this.userId,
      {
        vot: "P2" as never as IdentityVectorOfTrust,
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
      kidValid: this.userIdentityPostResponse?.body.kidValid,
      signatureValid: this.userIdentityPostResponse?.body.signatureValid,
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
      },
      vot: undefined,
      isValid: undefined,
      expired: true,
      kidValid: undefined,
      signatureValid: undefined,
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

const createAndPostCredentials = async (credentials: number, userId: string): Promise<string[]> => {
  const credentialJwts = [];
  const header: JWTHeaderParameters = getDefaultStoredIdentityHeader();
  for (let i = 0; i < credentials; i++) {
    const credentialPayload: IdentityCheckCredentialJWTClass = {
      sub: userId,
      iss: "http://cri.example.com",
      nbf: Math.floor(Date.now() / 1000),
      vc: {
        evidence: [],
      },
    };
    credentialJwts.push(await sign(header, credentialPayload));
  }

  if (credentialJwts.length) {
    const result = await evcsPostCredentials(
      userId,
      credentialJwts.map((jwt) => {
        return { vc: jwt, state: "CURRENT" };
      })
    );
    assert.equal(result.status, 202);
  }

  return credentialJwts;
};
Then("the stored identity kidValid field is {boolean}", function (kidValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.kidValid, kidValid);
});

Then("the stored identity signatureValid field is {boolean}", function (signatureValid: boolean) {
  assert.equal(this.userIdentityPostResponse?.body?.signatureValid, signatureValid);
});

Then<WorldDefinition>("the stored credentials should be returned", function () {
  // TODO: To be implemented in SPT-1629
});
