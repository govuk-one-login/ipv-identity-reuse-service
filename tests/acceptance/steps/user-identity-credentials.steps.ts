import { Given } from "@cucumber/cucumber";
import { WorldDefinition } from "./base-verbs.step";
import { evcsPatchCredentials } from "./utils/evcs-api";
import { createAndPostCredentials, createAndPostFraudCheckCredential } from "./helpers/credential-helpers";

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

Given<WorldDefinition>(
  "the user has a fraud check credential with nbf {int} months ago",
  async function (months: number) {
    const nbfDate = new Date();
    nbfDate.setDate(nbfDate.getDate() - months * 30);
    const fraudCheckJwt = await createAndPostFraudCheckCredential(this.userId, nbfDate);
    this.credentialJwts.push(fraudCheckJwt);
  }
);

Given<WorldDefinition>(
  "the user has a fraud check credential with nbf {int} months ago and fraudCheck {string}",
  async function (months: number, fraudCheckType: string) {
    const nbfDate = new Date();
    nbfDate.setDate(nbfDate.getDate() - months * 30);
    const fraudCheckJwt = await createAndPostFraudCheckCredential(this.userId, nbfDate, fraudCheckType);
    this.credentialJwts.push(fraudCheckJwt);
  }
);
